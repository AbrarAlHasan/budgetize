import { log, logError, logWarn } from "@/utils/logger";
import { Session } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./client";

// Complete the OAuth session in the browser
WebBrowser.maybeCompleteAuthSession();

/**
 * Sign in with Google OAuth using expo-auth-session
 * This approach gets the ID token directly from Google and uses it with Supabase
 * Reference: https://supabase.com/docs/guides/auth/social-login/auth-google?platform=react-native
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    // Get Google OAuth Client ID from environment or app.json
    // You need to set this in app.json extra config or as an environment variable
    const googleClientId =
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
      (require("expo-constants").default.expoConfig?.extra?.googleClientId as
        | string
        | undefined);

    if (!googleClientId) {
      return {
        error: new Error(
          "Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment variables or app.json."
        ),
      };
    }

    // Create redirect URL using expo-linking
    const redirectUri = Linking.createURL("/");

    log("Starting Google OAuth with redirect URI:", redirectUri);

    // Use authorization code flow with PKCE (recommended for mobile apps)
    // This is more secure than implicit flow and doesn't require client_secret
    const request = new AuthSession.AuthRequest({
      clientId: googleClientId,
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Code, // Authorization code flow
      redirectUri: redirectUri,
      usePKCE: true, // Enable PKCE for security (required for public clients)
    });

    // Google OAuth discovery endpoints
    const discovery = {
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      revocationEndpoint: "https://oauth2.googleapis.com/revoke",
    };

    // Prompt the user to authenticate with Google
    const result = await request.promptAsync(discovery);
    log("Google OAuth result:", result);
    
    if (result.type === "success") {
      // Extract the authorization code from the result
      const code = result.params.code;

      if (!code) {
        logError("OAuth result params:", result.params);
        return {
          error: new Error(
            "No authorization code received from Google OAuth."
          ),
        };
      }

      log("Google authorization code received, exchanging for tokens...");

      // Exchange the authorization code for tokens (including ID token)
      try {
        // Build the token exchange request
        const tokenRequestParams = new URLSearchParams({
          client_id: googleClientId,
          code: code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        });

        // Add code_verifier if PKCE is enabled
        // Note: expo-auth-session handles PKCE internally, but we need to access codeVerifier
        // If PKCE is enabled, the code_verifier is required for token exchange
        if (request.usePKCE) {
          // Try to get code verifier from the request
          // Note: This might not be directly accessible, so we'll try without it first
          // If you get an error, you may need to configure your Google OAuth client
          // to not require PKCE, or implement PKCE code verifier storage manually
          const codeVerifier = (request as any).codeVerifier;
          if (codeVerifier) {
            tokenRequestParams.append("code_verifier", codeVerifier);
          } else {
            logWarn(
              "PKCE is enabled but code_verifier not found. Token exchange may fail if PKCE is required."
            );
          }
        }

        // Make the token exchange request
        const tokenResponse = await fetch(discovery.tokenEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: tokenRequestParams.toString(),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          logError("Token exchange failed:", errorText);
          return {
            error: new Error(
              `Token exchange failed: ${errorText}. Make sure your Google OAuth client is configured as a Web application and doesn't require a client secret for public clients.`
            ),
          };
        }

        const tokenData = await tokenResponse.json();
        log("Token exchange response received");

        // Extract the ID token from the token response
        const idToken = tokenData.id_token;

        if (!idToken) {
          logError("Token response:", tokenData);
          return {
            error: new Error(
              "No ID token received after code exchange. Token response: " +
                JSON.stringify(tokenData)
            ),
          };
        }

        log("Google ID token received, signing in to Supabase...");

        // Use the ID token to sign in to Supabase
        const { data, error: supabaseError } =
          await supabase.auth.signInWithIdToken({
            provider: "google",
            token: idToken,
          });

        if (supabaseError) {
          logError("Supabase sign-in error:", supabaseError);
          return { error: supabaseError };
        }

        if (!data.session) {
          return {
            error: new Error("Failed to create session with Supabase"),
          };
        }

        log("Google OAuth login successful");
        return { error: null };
      } catch (exchangeError) {
        logError("Token exchange error:", exchangeError);
        return { error: exchangeError as Error };
      }
    } else if (result.type === "cancel") {
      return { error: new Error("User cancelled OAuth flow") };
    } else {
      return { error: new Error(`OAuth flow failed: ${result.type}`) };
    }
  } catch (error) {
    logError("Unexpected error during Google sign-in:", error);
    return { error: error as Error };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logError("Sign out error:", error);
      return { error };
    }
    return { error: null };
  } catch (error) {
    logError("Unexpected error during sign out:", error);
    return { error: error as Error };
  }
}

/**
 * Get the current session with timeout to prevent hanging when offline
 */
export async function getSession(): Promise<{ session: Session | null; error: Error | null }> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    // Add timeout to prevent hanging when network is unavailable
    // Supabase stores sessions locally, so we should be able to read from cache
    // even when offline, but if it tries to refresh, it might hang
    const timeoutPromise = new Promise<{ session: null; error: Error }>((resolve) => {
      timeoutId = setTimeout(() => {
        resolve({
          session: null,
          error: new Error("Session check timed out (likely offline)"),
        });
      }, 3000); // 3 second timeout
    });

    const sessionPromise = supabase.auth.getSession().then((result) => {
      // Clear timeout if session call completes
      if (timeoutId) clearTimeout(timeoutId);
      const {
        data: { session },
        error,
      } = result;
      if (error) {
        logError("Get session error:", error);
        return { session: null, error };
      }
      return { session, error: null };
    }).catch((error) => {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId);
      logError("Get session exception:", error);
      return { session: null, error: error as Error };
    });

    // Race between the actual call and timeout
    const result = await Promise.race([sessionPromise, timeoutPromise]);
    
    // Clear timeout in case it's still running
    if (timeoutId) clearTimeout(timeoutId);
    
    // If timeout won, the session might still be in local storage
    // Supabase's getSession should read from local storage first, but if it's
    // trying to refresh the token, it will hang. The timeout prevents that.
    // If we got a timeout, it means we're likely offline, so return null session
    // which is fine - the app can work without auth (auth is only for cloud backup)
    if (result.error && result.error.message.includes("timed out")) {
      logWarn("Session check timed out (likely offline), continuing without auth");
      return { session: null, error: null }; // Return no error so app can continue
    }
    
    return result;
  } catch (error) {
    logError("Unexpected error getting session:", error);
    return { session: null, error: error as Error };
  }
}

/**
 * Get the current user
 */
export function getCurrentUser() {
  return supabase.auth.getUser();
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

import * as Notifications from 'expo-notifications';
import { log, logError } from '@/utils/logger';
import { exchangeReminderRepository } from '@/repositories/exchange-reminder.repository';
import { exchangeRepository } from '@/repositories/exchange.repository';
import { ExchangeReminderType } from '@/db/schema/types';
import { format, addDays, parseISO } from 'date-fns';

/**
 * Service for managing exchange reminders and notifications
 */
export class ExchangeReminderService {
  /**
   * Create reminders for an exchange based on due date
   */
  async createRemindersForExchange(
    exchangeId: number,
    dueDate: string | null,
    reminderDaysBefore: number[] = [1, 0] // 1 day before, on due date
  ): Promise<void> {
    try {
      // Delete existing reminders for this exchange
      await exchangeReminderRepository.deleteByExchangeId(exchangeId);

      if (!dueDate) {
        return; // No due date, no reminders
      }

      const dueDateObj = parseISO(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create reminders
      for (const daysBefore of reminderDaysBefore) {
        const reminderDate = addDays(dueDateObj, -daysBefore);
        reminderDate.setHours(9, 0, 0, 0); // 9 AM reminder

        // Only create reminders for future dates
        if (reminderDate >= today) {
          const reminderType: ExchangeReminderType = daysBefore === 0 
            ? (reminderDate < dueDateObj ? 'due_date' : 'due_date')
            : 'due_date';

          // Schedule notification
          const notificationId = await this.scheduleNotification(
            exchangeId,
            reminderDate,
            reminderType
          );

          // Create reminder record
          await exchangeReminderRepository.create({
            exchange_id: exchangeId,
            reminder_type: reminderType,
            reminder_date: reminderDate.toISOString(),
            notification_id: notificationId,
          });
        }
      }

      // Create overdue reminder (1 day after due date if still pending)
      const overdueDate = addDays(dueDateObj, 1);
      overdueDate.setHours(9, 0, 0, 0);
      
      if (overdueDate >= today) {
        const notificationId = await this.scheduleNotification(
          exchangeId,
          overdueDate,
          'overdue'
        );

        await exchangeReminderRepository.create({
          exchange_id: exchangeId,
          reminder_type: 'overdue',
          reminder_date: overdueDate.toISOString(),
          notification_id: notificationId,
        });
      }
    } catch (error) {
      logError('Error creating reminders for exchange:', error);
    }
  }

  /**
   * Schedule a notification for an exchange reminder
   */
  private async scheduleNotification(
    exchangeId: number,
    reminderDate: Date,
    reminderType: ExchangeReminderType
  ): Promise<string | null> {
    try {
      const exchange = await exchangeRepository.findById(exchangeId);
      if (!exchange) return null;

      const decryptedExchange = await exchangeRepository.decryptExchange(exchange);
      const personName = decryptedExchange.person_name;
      const amount = decryptedExchange.amount;
      // Default currency symbol - can be enhanced to get from settings if needed
      const currencySymbol = '₹';

      let title = '';
      let body = '';

      if (reminderType === 'due_date') {
        title = 'Exchange Due Today';
        body = `${personName} - ${currencySymbol}${amount.toLocaleString()} is due today`;
      } else if (reminderType === 'overdue') {
        title = 'Exchange Overdue';
        body = `${personName} - ${currencySymbol}${amount.toLocaleString()} is overdue`;
      }

      const identifier = `exchange_reminder_${exchangeId}_${reminderType}_${reminderDate.getTime()}`;

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            exchangeId,
            reminderType,
          },
        },
        trigger: reminderDate,
      });

      return identifier;
    } catch (error) {
      logError('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel all reminders for an exchange
   */
  async cancelRemindersForExchange(exchangeId: number): Promise<void> {
    try {
      const reminders = await exchangeReminderRepository.findByExchangeId(exchangeId);
      
      // Cancel notifications
      for (const reminder of reminders) {
        if (reminder.notification_id) {
          try {
            await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
          } catch (error) {
            logError(`Error canceling notification ${reminder.notification_id}:`, error);
          }
        }
      }

      // Delete reminder records
      await exchangeReminderRepository.deleteByExchangeId(exchangeId);
    } catch (error) {
      logError('Error canceling reminders for exchange:', error);
    }
  }

  /**
   * Process and mark overdue reminders as sent
   */
  async processOverdueReminders(): Promise<void> {
    try {
      const overdueReminders = await exchangeReminderRepository.getOverdueReminders();
      
      for (const reminder of overdueReminders) {
        // Mark as sent
        await exchangeReminderRepository.markAsSent(reminder.id, reminder.notification_id || undefined);
      }
    } catch (error) {
      logError('Error processing overdue reminders:', error);
    }
  }
}

export const exchangeReminderService = new ExchangeReminderService();


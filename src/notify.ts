import { Notification, NotificationConstructorOptions } from 'electron'; // tslint:disable-line no-implicit-dependencies
import settings from 'electron-settings';

interface INotificationOptions extends NotificationConstructorOptions {
  onClick: () => void;
}

const notify = (options: INotificationOptions): void => {
  if (settings.get('showNotifications')) {
    const notification = new Notification(options);
    notification.on('click', options.onClick);
    // notifications with an attached click handler
    // won't disappear by itself
    // -> close it after certain timeframe automatically
    notification.on('show', () => setTimeout(() => notification.close(), 4000));
    notification.show();
  }
};

export default notify;

import * as electron from 'electron'; // tslint:disable-line no-implicit-dependencies
import settings from 'electron-settings';
import notify from './notify';
jest.mock('electron-settings');

describe('notify function', () => {
  test('does not create a notification if showNotifications is set to false', () => {
    const mockGet = settings.get as jest.Mock; // otherwise ts doesn't think get has :mockImplementation
    mockGet.mockImplementation(() => false); // getting any setting will return false
    notify({ title: 'test title', body: 'test body' }, jest.fn());
    expect(mockGet).toHaveBeenCalledWith('showNotifications');
    expect(mockGet.mock.results[0].value).toEqual(false);
  });
  test('if showNotifications is set to true, it creates a notification then calls notification.show', () => {
    const Notification = electron.Notification as any;
    const mockShow = jest.fn();
    Notification.prototype.on = jest.fn();
    Notification.prototype.show = mockShow;
    const mockGet = settings.get as jest.Mock; // otherwise ts doesn't think get has :mockImplementation
    mockGet.mockImplementation(() => true);
    notify({ title: 'test title', body: 'test body' }, jest.fn());
    expect(mockShow).toHaveBeenCalled();
  });
});

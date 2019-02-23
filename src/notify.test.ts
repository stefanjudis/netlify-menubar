import * as electron from 'electron'; // tslint:disable-line no-implicit-dependencies
import settings from 'electron-settings';
import notify from './notify';
jest.mock('electron-settings');
const mockElectron = electron as any;
const mockGet = settings.get as jest.Mock; // otherwise ts doesn't think get has :mockImplementation

describe('notify function', () => {
  test('if showNotifications setting is false, does not create a Notification ', () => {
    mockGet.mockImplementation(() => false); // getting any setting will return false
    notify({ title: 'test title', body: 'test body' }, jest.fn());
    expect(mockGet).toHaveBeenCalledWith('showNotifications');
    expect(mockGet.mock.results[0].value).toEqual(false);
    expect(mockElectron.inMockConstructor).not.toHaveBeenCalled();
  });
  test('if showNotifications setting is true, it creates a Notification, registers callbacks, calls notifation.show()', () => {
    mockGet.mockImplementation(() => true);
    notify({ title: 'test title', body: 'test body' }, jest.fn());
    expect(mockElectron.inMockConstructor).toHaveBeenCalled();
    expect(mockElectron.mockOn).toHaveBeenCalledTimes(2);
    expect(mockElectron.mockShow).toHaveBeenCalled();
  });
});

const mockGetSettings = jest.fn();
const mockOn = jest.fn();
const mockShow = jest.fn();
const inMockConstructor = jest.fn();
class Notification {
  public on = mockOn;
  public show = mockShow;
  constructor() {
    inMockConstructor();
  }
}
/* doMock instead of mock to prevent hoisting above class and const declarations*/
jest.doMock('electron', () => ({
  Notification
}));
jest.doMock('electron-settings', () => ({
  get: mockGetSettings
}));

// this import must come after jest.doMock(...
import notify from './notify';

describe('notify function', () => {
  test('if showNotifications setting is false, does not create a Notification ', () => {
    mockGetSettings.mockImplementation(() => false); // getting any setting will return false
    notify({ title: 'test title', body: 'test body' }, jest.fn());
    expect(mockGetSettings).toHaveBeenCalledWith('showNotifications');
    expect(mockGetSettings.mock.results[0].value).toEqual(false);
    expect(inMockConstructor).not.toHaveBeenCalled();
  });
  test('if showNotifications setting is true, it creates a Notification, registers callbacks, calls notifation.show()', () => {
    mockGetSettings.mockImplementation(() => true);
    notify({ title: 'test title', body: 'test body' }, jest.fn());
    expect(inMockConstructor).toHaveBeenCalled();
    expect(mockOn).toHaveBeenCalledTimes(2);
    expect(mockShow).toHaveBeenCalled();
  });
});

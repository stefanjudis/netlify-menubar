import settings from 'electron-settings';
import notify from './notify';

const mockGetSettings = jest.spyOn(settings, 'get');

describe('notify function', () => {
  test('does not create a notification if showNotifications is set to false', () => {
    mockGetSettings.mockImplementation(() => false);
    notify({ title: '', body: '' }, jest.fn());
    expect(mockGetSettings).toHaveBeenCalledWith('showNotifications');
    expect(mockGetSettings.mock.results[0].value).toEqual(false);
  });
  test('creates a notification if showNotifications is set to true', () => {
    // add test that mocks Notications here
  });
});

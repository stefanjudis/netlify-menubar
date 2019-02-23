export const mockOn = jest.fn();
export const mockShow = jest.fn();
export class Notification {
  public on = mockOn;
  public show = mockShow;
}

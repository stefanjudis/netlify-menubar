import scheduler from '../scheduler';

function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

describe('scheduler', () => {
  describe(':repeat', () => {
    test('repeats function call in set interval and accepts stop/resume', async () => {
      jest.useFakeTimers();
      const mFn = jest.fn();
      mFn.mockImplementation(() => Promise.resolve());

      scheduler.repeat([
        {
          fn: mFn,
          interval: 1000
        }
      ]);

      await flushPromises();

      expect(mFn).toHaveBeenLastCalledWith({ isFirstRun: true });
      jest.advanceTimersByTime(1000);
      expect(mFn).toHaveBeenLastCalledWith({ isFirstRun: false });
      jest.advanceTimersByTime(1000);
      expect(mFn).toHaveBeenLastCalledWith({ isFirstRun: false });
      expect(mFn.mock.calls.length).toBe(3);

      scheduler.stop();
      jest.advanceTimersByTime(1000);
      expect(mFn.mock.calls.length).toBe(3);
      scheduler.resume();
      expect(mFn.mock.calls.length).toBe(4);
    });
  });
});

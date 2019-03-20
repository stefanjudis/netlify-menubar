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

      expect(mFn).toHaveBeenLastCalledWith({ isFirstRun: true });
      expect(mFn.mock.calls.length).toBe(1);

      await flushPromises();
      jest.advanceTimersByTime(1000);
      expect(mFn).toHaveBeenLastCalledWith({ isFirstRun: false });
      expect(mFn.mock.calls.length).toBe(2);

      await flushPromises();
      scheduler.stop();
      jest.advanceTimersByTime(10000);
      expect(mFn.mock.calls.length).toBe(2);

      scheduler.resume();
      expect(mFn.mock.calls.length).toBe(3);

      await flushPromises();
      jest.advanceTimersByTime(1000);
      expect(mFn.mock.calls.length).toBe(4);
    });
  });
});

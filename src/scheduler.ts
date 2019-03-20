interface IRun {
  fn: (options: any) => Promise<void>;
  interval: number;
  timeout?: NodeJS.Timeout | null;
}

let queue: IRun[] = [];
const errors: Error[] = [];

const repeat = (fns: IRun[]): void => {
  fns.forEach(async run => {
    queue.push(run);
    const { fn, interval } = run;
    await fn({ isFirstRun: true });

    const repeatFn = () => {
      run.timeout = setTimeout(async () => {
        try {
          await fn({ isFirstRun: false });
        } catch (e) {
          errors.push(e);
        } finally {
          repeatFn();
        }
      }, interval);
    };

    repeatFn();
  });
};

const stop = (): void => {
  queue.forEach(run => {
    if (run.timeout) {
      clearTimeout(run.timeout);
      run.timeout = null;
    }
  });
};

const resume = (): void => {
  const tmpQueue = [...queue];
  queue = [];
  repeat(tmpQueue);
};

export default {
  repeat,
  resume,
  stop
};

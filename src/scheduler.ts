interface IRun {
  fn: (options: any) => Promise<void>;
  interval: number;
}

const queue: IRun[] = [];
const intervals = new Set();
// TODO enable a visible error log later
const errors: Error[] = [];

const repeat = (fns: IRun[]): void => {
  fns.forEach(async run => {
    queue.push(run);
    const { fn, interval } = run;
    await fn({ isFirstRun: true });

    const currentId = setInterval(async () => {
      try {
        await fn({ isFirstRun: false });
      } catch (e) {
        errors.push(e);
      }
    }, interval);
    intervals.add(currentId);
  });
};

const stop = (): void => {
  intervals.forEach(id => {
    clearInterval(id);
  });
  intervals.clear();
};
const resume = (): void => repeat(queue);

export default {
  repeat,
  resume,
  stop
};

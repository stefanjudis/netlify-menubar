import { IAppDeploys } from './menubar';
import { INetlifyDeploy } from './netlify';

interface IDeploysReduceAcc {
  pending: INetlifyDeploy[];
  ready: INetlifyDeploy[];
  foundReadyDeploy: boolean;
}

const isReady = deploy => deploy.state === 'ready';
const isSkipped = deploy =>
  deploy.state === 'error' && deploy.error_message === 'Skipped';

/**
 *
 * @param deploys {INetlifyDeploy[]}
 * @returns IAppDeploys
 * @tested
 */
export const getFormattedDeploys = (deploys: INetlifyDeploy[]): IAppDeploys => {
  const formattedDeploys = deploys.reduce(
    (acc: IDeploysReduceAcc, deploy: INetlifyDeploy): IDeploysReduceAcc => {
      if (!acc.foundReadyDeploy && (isReady(deploy) || isSkipped(deploy))) {
        acc.foundReadyDeploy = true;
      }

      if (acc.foundReadyDeploy) {
        acc.ready.push(deploy);
      } else {
        acc.pending.push(deploy);
      }

      if (deploy.state === 'error' && deploy.error_message === 'Skipped') {
        deploy.state = 'skipped';
      }

      return acc;
    },
    { pending: [], ready: [], foundReadyDeploy: false }
  );

  return {
    pending: formattedDeploys.pending,
    ready: formattedDeploys.ready
  };
};

/**
 *
 * @param deployCount
 * @tested
 */
export const getSuspendedDeployCount = (deployCount: number): string => {
  if (deployCount > 0) {
    return `${
      deployCount > 9
        ? String.fromCharCode(8329) + '₊'
        : String.fromCharCode(8320 + deployCount)
    }`;
  } else {
    return '';
  }
};

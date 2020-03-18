import { dialog, MessageBoxReturnValue, shell } from 'electron'; // tslint:disable-line no-implicit-dependencies
import fetch from 'node-fetch';

const showMessageBox = (options: any): Promise<MessageBoxReturnValue> =>
  dialog.showMessageBox(options);

interface INetlifyTicket {
  id: string;
  client_id: string;
  authorized: boolean;
}

interface INetlifyBuild {
  id: string;
  deploy_id: string;
  sha: string;
  done: boolean;
  error: string;
}

export interface INetlifyDeploy {
  context: string;
  created_at: string;
  state: string;
  branch: string;
  deploy_time: string;
  error_message: string;
  id: string;
}

export interface INetlifySite {
  id: string;
  name: string;
  url: string;
  admin_url: string;
}

export interface INetlifyUser {
  email: string;
}

interface INetlifyAccessToken {
  id: string;
  access_token: string;
  user_id: string;
  user_email: string;
}

export const API_URL = 'https://api.netlify.com/api/v1';
export const UI_URL = 'https://app.netlify.com';

class Netlify {
  public accessToken: string | null;
  private API_URL: string;
  private UI_URL: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.API_URL = API_URL;
    this.UI_URL = UI_URL;
  }

  public async authorize(clientId: string): Promise<Netlify> {
    if (this.accessToken) {
      try {
        await this.getCurrentUser();
        return this;
      } catch (e) {
        // fetching the current user failed
        // meaning that the access token is not valid
        // -> clear access token and issue a new one
        this.accessToken = null;
        return this.authorize(clientId);
      }
    }

    const messageBoxReturn = await showMessageBox({
      buttons: ['Open Netlify', 'Cancel'],
      cancelId: 1,
      defaultId: 0,
      message:
        "In order to access your build information Netlify Menubar has to be authorized in the Netlify UI.\n\n This is a mandatory step and without it the App won't work...",
      title: 'Authorize Netlify Menubar',
      type: 'question'
    });

    if (messageBoxReturn.response !== 0) {
      return process.exit();
    }

    const ticket = await this.fetch<INetlifyTicket>(
      `/oauth/tickets?client_id=${clientId}`,
      'POST'
    );

    shell.openExternal(
      `${this.UI_URL}/authorize?response_type=ticket&ticket=${ticket.id}`
    );

    this.accessToken = await this.getAccessToken(ticket.id);

    return this;
  }

  /**
   * @param {string} siteId
   * @returns {Promise<INetlifyBuild>}
   * @memberof Netlify
   * @tested
   */
  public createSiteBuild(siteId: string): Promise<INetlifyBuild> {
    return this.fetch<INetlifyBuild>(`/sites/${siteId}/builds`, 'POST');
  }

  /**
   * @returns {Promise<INetlifyUser>}
   * @memberof Netlify
   * @tested
   */
  public getCurrentUser(): Promise<INetlifyUser> {
    return this.fetch<INetlifyUser>('/user');
  }

  /**
   * @returns {Promise<INetlifySite[]>}
   * @memberof Netlify
   * @tested
   */
  public getSites(): Promise<INetlifySite[]> {
    return this.fetch<INetlifySite[]>('/sites');
  }

  /**
   * @param {string} siteId
   * @returns {Promise<INetlifyDeploy[]>}
   * @memberof Netlify
   * @tested
   */
  public getSiteDeploys(siteId: string): Promise<INetlifyDeploy[]> {
    // paginate the deploys to not generate too much load on netlify's side
    // https://github.com/stefanjudis/netlify-menubar/issues/20
    return this.fetch<INetlifyDeploy[]>(
      `/sites/${siteId}/deploys?page=1&per_page=15`
    );
  }

  /**
   * @template T
   * @param {string} path
   * @param {string} [method='GET']
   * @returns {Promise<T>}
   * @memberof Netlify
   * @tested
   */
  public async fetch<T>(path: string, method: string = 'GET'): Promise<T> {
    // tslint:disable-next-line
    console.log('NETLIFY CALL:', path, method);
    const response = await fetch(`${this.API_URL}${path}`, {
      headers: {
        authorization: `Bearer ${this.accessToken}`
      },
      method
    });

    if (response.status === 401) {
      throw new Error('NOT_AUTHORIZED');
    }

    // tslint:disable-next-line
    console.log('NETLIFY CALL DONE:', path, method);
    return response.json();
  }

  private async getAccessToken(ticketId: string): Promise<string> {
    const waitFor = (delay: number): Promise<void> =>
      new Promise(resolve => setTimeout(resolve, delay));

    const checkTicket = async (): Promise<INetlifyTicket> => {
      return this.fetch(`/oauth/tickets/${ticketId}`);
    };

    let authorizedTicket: INetlifyTicket | null = null;

    while (!authorizedTicket) {
      const ticket = await checkTicket();
      if (ticket.authorized) {
        authorizedTicket = ticket;
      }
      await waitFor(1000);
    }

    const response = await this.fetch<INetlifyAccessToken>(
      `/oauth/tickets/${ticketId}/exchange`,
      'POST'
    );
    return response.access_token;
  }
}

export default Netlify;

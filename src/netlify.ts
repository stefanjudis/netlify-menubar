import { dialog, shell } from 'electron'; // tslint:disable-line no-implicit-dependencies
import fetch from 'node-fetch';

const showMessageBox = (options: any): Promise<number> =>
  new Promise(resolve => {
    dialog.showMessageBox(options, responseNumber => resolve(responseNumber));
  });

interface NetlifyTicket {
  id: string;
  client_id: string;
  authorized: boolean;
}

interface NetlifyBuild {
  id: string;
  deploy_id: string;
  sha: string;
  done: boolean;
  error: string;
}

export interface NetlifyDeploy {
  context: string;
  created_at: string;
  state: string;
  branch: string;
  deploy_time: string;
  id: string;
}

export interface NetlifySite {
  id: string;
  name: string;
  url: string;
  admin_url: string;
}

export interface NetlifyUser {
  email: string;
}

interface NetlifyAccessToken {
  id: string;
  access_token: string;
  user_id: string;
  user_email: string;
}

class Netlify {
  public accessToken: string | null;
  private API_URL: string;
  private UI_URL: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.API_URL = 'https://api.netlify.com/api/v1';
    this.UI_URL = 'https://app.netlify.com';
  }

  public getCurrentUser(): Promise<NetlifyUser> {
    return this.fetch<NetlifyUser>('/user');
  }

  public async authorize(clientId: string): Promise<void> {
    if (this.accessToken) {
      try {
        await this.getCurrentUser();
        return;
      } catch (e) {
        // fetching the current user failed
        // meaning that the access token is not valid
        // -> clear access token and issue a new one
        this.accessToken = null;
        this.authorize(clientId);
      }
    }

    const responseId = await showMessageBox({
      buttons: ['Open Netlify', 'Cancel'],
      cancelId: 1,
      defaultId: 0,
      message:
        "In order to access your build information Netlify Menubar has to be authorized in the Netlify UI.\n\n This is a mandatory step and without it the App won't work...",
      title: 'Authorize Netlify Menubar',
      type: 'question'
    });

    if (responseId !== 0) {
      return process.exit();
    }

    const ticket = await this.fetch<NetlifyTicket>(
      `/oauth/tickets?client_id=${clientId}`,
      'POST'
    );

    shell.openExternal(
      `${this.UI_URL}/authorize?response_type=ticket&ticket=${ticket.id}`
    );

    this.accessToken = await this.getAccessToken(ticket.id);
  }

  public getSites(): Promise<NetlifySite[]> {
    return this.fetch<NetlifySite[]>('/sites');
  }

  public createSiteBuild(siteId: string): Promise<NetlifyBuild> {
    return this.fetch<NetlifyBuild>(`/sites/${siteId}/builds`, 'POST');
  }

  public getSiteDeploys(siteId: string): Promise<NetlifyDeploy[]> {
    return this.fetch<NetlifyDeploy[]>(`/sites/${siteId}/deploys`);
  }

  private async getAccessToken(ticketId: string): Promise<string> {
    const waitFor = (delay: number): Promise<void> =>
      new Promise(resolve => setTimeout(resolve, delay));
    const checkTicket = async (): Promise<NetlifyTicket> => {
      return this.fetch(`/oauth/tickets/${ticketId}`);
    };

    let authorizedTicket: NetlifyTicket | null = null;

    while (!authorizedTicket) {
      const ticket = await checkTicket();
      if (ticket.authorized) {
        authorizedTicket = ticket;
      }
      await waitFor(1000);
    }

    const response = await this.fetch<NetlifyAccessToken>(
      `/oauth/tickets/${ticketId}/exchange`,
      'POST'
    );
    return response.access_token;
  }

  private async fetch<T>(path: string, method: string = 'GET'): Promise<T> {
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

    return response.json();
  }
}

export default Netlify;

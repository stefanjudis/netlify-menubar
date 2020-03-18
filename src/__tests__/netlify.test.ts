import fetch from 'node-fetch';
import Netlify, { API_URL } from '../netlify';

// TODO place this in global config somehwere
// tslint:disable-next-line
console.log = () => {};

jest.mock('node-fetch');
jest.mock('electron', () => ({
  dialog: {
    showMessageBox: jest.fn((options, cb) => cb(0))
  },
  shell: {
    openExternal: jest.fn()
  }
}));

interface IFetchResponse {
  response?: number;
  json: () => {};
}

const getFetchPromise = async (
  json: {} = {},
  response: {} = {}
): Promise<IFetchResponse> => {
  const result = await {
    ...(response && response),
    json: () => new Promise(res => res(json))
  };
  return result;
};

describe('netlify api client', () => {
  const apiToken = 'awesomeToken';
  let apiClient: Netlify;
  const mFetch = (fetch as unknown) as jest.Mock<Promise<IFetchResponse>>;

  beforeEach(() => {
    apiClient = new Netlify(apiToken);
    mFetch.mockReset();
  });

  describe(':fetch', () => {
    test('stores accessToken in api client', async () => {
      expect(apiClient.accessToken).toBe(apiToken);
    });

    test('sets authorization header properly', async () => {
      mFetch.mockResolvedValue(getFetchPromise());
      await apiClient.fetch('/foo');
      expect(mFetch.mock.calls[0][0].endsWith('/foo')).toBeTruthy();
      expect(mFetch.mock.calls[0][1].headers.authorization).toBe(
        `Bearer ${apiToken}`
      );
    });

    test("rejects 'NOT_AUTHORIZED' error in case of 401", async () => {
      mFetch.mockResolvedValue(
        getFetchPromise(
          {},
          {
            status: 401
          }
        )
      );
      await expect(apiClient.fetch('/foo')).rejects.toThrow('NOT_AUTHORIZED');
    });

    test('returns the correct response', async () => {
      const response = { foo: 'bar' };
      mFetch.mockResolvedValue(getFetchPromise(response));

      const result = await apiClient.fetch('/foo');
      expect(result).toBe(response);
    });
  });

  describe(':getCurrentUser', () => {
    test('calls the correct URL', async () => {
      mFetch.mockResolvedValue(getFetchPromise({}));
      await apiClient.getCurrentUser();
      expect(mFetch.mock.calls[0][0]).toBe(`${API_URL}/user`);
    });
  });

  describe(':getSites', () => {
    test('calls the correct URL', async () => {
      mFetch.mockResolvedValue(getFetchPromise({}));
      await apiClient.getSites();
      expect(mFetch.mock.calls[0][0]).toBe(`${API_URL}/sites`);
    });
  });

  describe(':getSiteDeploys', () => {
    test('calls the correct URL', async () => {
      const siteId = '123456789';
      mFetch.mockResolvedValue(getFetchPromise({}));
      await apiClient.getSiteDeploys(siteId);
      expect(mFetch.mock.calls[0][0]).toBe(
        `${API_URL}/sites/${siteId}/deploys?page=1&per_page=15`
      );
    });
  });

  describe(':createSiteBuild', () => {
    test('calls the correct URL with the correct HTTP method', async () => {
      const siteId = '123456789';
      mFetch.mockResolvedValue(getFetchPromise({}));
      await apiClient.createSiteBuild(siteId);
      expect(mFetch.mock.calls[0][0]).toBe(`${API_URL}/sites/${siteId}/builds`);
      expect(mFetch.mock.calls[0][1].method).toBe('POST');
    });
  });

  describe(':authorize', () => {
    test('calls the API check validity of the token and return client', async () => {
      mFetch.mockResolvedValue(getFetchPromise({}));
      const client = await apiClient.authorize('clientId');
      expect(mFetch.mock.calls.length).toBe(1);
      expect(client).toBe(apiClient);
    });

    test('invalid token', async () => {
      const newToken = 'yeah-awesome-token';

      mFetch.mockResolvedValueOnce(getFetchPromise({}, { status: 401 }));
      mFetch.mockResolvedValueOnce(getFetchPromise({ id: 'ticketId' }));
      mFetch.mockResolvedValueOnce(getFetchPromise({ authorized: false }));
      mFetch.mockResolvedValueOnce(getFetchPromise({ authorized: true }));
      mFetch.mockResolvedValueOnce(getFetchPromise({ access_token: newToken }));

      const client = await apiClient.authorize('clientId2');

      expect(client.accessToken).toBe(newToken);
      expect(mFetch.mock.calls.length).toBe(5);
    });
  });
});

import * as fetch from 'node-fetch';
import Netlify, { API_URL } from './netlify';

// TODO place this in global config somehwere
// tslint:disable-next-line
console.log = () => {};

jest.mock('node-fetch');

const getFetchPromise = (json: {} = {}, response: {} = {}): Promise<any> => {
  return new Promise(res1 =>
    res1({
      ...(response && response),
      json: () => new Promise(res2 => res2(json))
    })
  );
};

describe('netlify api client', () => {
  const apiToken = 'awesomeToken';
  let apiClient: Netlify;
  const mFetch = fetch.default as jest.Mock<typeof fetch.default>;

  beforeEach(() => {
    apiClient = new Netlify(apiToken);
    mFetch.mockReset();
  });

  describe(':fetch', () => {
    test('accessToken is stored in api client', async () => {
      expect(apiClient.accessToken).toBe(apiToken);
    });

    test('authorization header is properly set', async () => {
      mFetch.mockReturnValue(getFetchPromise());
      await apiClient.fetch('/foo');
      expect(mFetch.mock.calls[0][0].endsWith('/foo')).toBeTruthy();
      expect(mFetch.mock.calls[0][1].headers.authorization).toBe(
        `Bearer ${apiToken}`
      );
    });

    test("rejects 'NOT_AUTHORIZED' error in case of 401", async () => {
      mFetch.mockReturnValue(
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
      mFetch.mockReturnValue(getFetchPromise(response));

      const result = await apiClient.fetch('/foo');
      expect(result).toBe(response);
    });
  });

  describe(':getCurrentUser', () => {
    test('calls the right URL', async () => {
      mFetch.mockReturnValue(getFetchPromise({}));
      await apiClient.getCurrentUser();
      expect(mFetch.mock.calls[0][0]).toBe(`${API_URL}/user`);
    });
  });

  describe(':getSites', () => {
    test('calls the right URL', async () => {
      mFetch.mockReturnValue(getFetchPromise({}));
      await apiClient.getSites();
      expect(mFetch.mock.calls[0][0]).toBe(`${API_URL}/sites`);
    });
  });

  describe(':getSiteDeploys', () => {
    test('calls the right URL', async () => {
      const siteId = '123456789';
      mFetch.mockReturnValue(getFetchPromise({}));
      await apiClient.getSiteDeploys(siteId);
      expect(mFetch.mock.calls[0][0]).toBe(
        `${API_URL}/sites/${siteId}/deploys`
      );
    });
  });
});

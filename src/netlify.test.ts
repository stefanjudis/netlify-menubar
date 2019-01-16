import * as fetch from 'node-fetch';
import Netlify from './netlify';

// TODO place this in global config somehwere
// tslint:disable-next-line
console.log = () => {};

jest.mock('node-fetch');
const mFetch = fetch.default as jest.Mock<typeof fetch.default>;

describe('netlify api client', () => {
  const apiToken = 'awesomeToken';
  let apiClient: Netlify;

  beforeEach(() => (apiClient = new Netlify(apiToken)));

  test('accessToken is stored in api client', () => {
    expect(apiClient.accessToken).toBe(apiToken);
  });

  test('authorization header is properly set', async () => {
    mFetch.mockReturnValue(
      new Promise(res1 =>
        res1({
          json: () => new Promise(res => res())
        })
      )
    );
    apiClient.fetch('/foo');
    expect(mFetch.mock.calls[0][0].endsWith('/foo')).toBeTruthy();
    expect(mFetch.mock.calls[0][1].headers.authorization).toBe(
      `Bearer ${apiToken}`
    );
  });

  test("throws 'NOT_AUTHORIZED' error in case of 401", async () => {
    mFetch.mockReturnValue(
      new Promise(res =>
        res({
          foo: 'bar',
          status: 401
        })
      )
    );
    await expect(apiClient.fetch('/foo')).rejects.toThrow('NOT_AUTHORIZED');
  });
});

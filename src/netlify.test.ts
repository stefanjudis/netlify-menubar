import fetch from 'node-fetch';
import Netlify from './netlify';

jest.mock('node-fetch');

describe('netlify api client', () => {
  const apiToken = 'awesomeToken';
  let apiClient: Netlify;

  beforeEach(() => (apiClient = new Netlify(apiToken)));

  test('accessToken is stored in api client', () => {
    expect(apiClient.accessToken).toBe(apiToken);
  });
});

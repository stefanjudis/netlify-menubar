const firstResponse = {
  items: [
    { link: 'id=1', content: 'not updated' },
    { link: 'id=2', content: 'not updated' }
  ]
};
const secondResponse = {
  items: [
    { link: 'id=1', content: 'not updated' },
    { link: 'id=2', content: 'not updated' },
    { link: 'id=3', content: 'not updated' }
  ]
};
const thirdResponse = {
  items: [
    { link: 'id=1', content: 'updated' },
    { link: 'id=2', content: 'not updated' },
    { link: 'id=3', content: 'not updated' }
  ]
};
const fourthResponse = {
  items: [
    { link: 'id=1', content: 'updated' },
    { link: 'id=2', content: 'not updated' },
    { link: 'id=3', content: 'not updated' }
  ]
};

// TODO place this in global config somehwere
// tslint:disable-next-line
console.log = () => {};

jest.doMock(
  'rss-parser',
  () =>
    // has to use function keyword to be called with new keyword (ie act as a constructor)
    /* tslint:disable-line only-arrow-functions */ function() {
      return {
        parseURL: jest
          .fn()
          .mockReturnValueOnce(firstResponse)
          .mockReturnValueOnce(secondResponse)
          .mockReturnValueOnce(thirdResponse)
          .mockReturnValueOnce(fourthResponse)
      };
    }
);

import IncidentFeed from '../incidentFeed';
const incidentFeed = new IncidentFeed();

describe('IncidentFeed', () => {
  test('before :update is called, :getFeed returns an empty array', () => {
    expect(incidentFeed.getFeed()).toMatchObject([]);
    expect(incidentFeed.getFeed()).not.toMatchObject(['some value']);
  });
  test('first update', async () => {
    await incidentFeed.update();
    expect(incidentFeed.getFeed()).toBe(firstResponse.items);
    expect(incidentFeed.newIncidents()).toMatchObject([]);
    expect(incidentFeed.updatedIncidents()).toMatchObject([]);
  });
  test('second update', async () => {
    await incidentFeed.update();
    expect(incidentFeed.getFeed()).toBe(secondResponse.items);
    expect(incidentFeed.newIncidents()).toMatchObject([
      { link: 'id=3', content: 'not updated' }
    ]);
    expect(incidentFeed.updatedIncidents()).toMatchObject([]);
  });
  test('third update', async () => {
    await incidentFeed.update();
    expect(incidentFeed.getFeed()).toBe(thirdResponse.items);
    expect(incidentFeed.newIncidents()).toMatchObject([]);
    expect(incidentFeed.updatedIncidents()).toMatchObject([
      { link: 'id=1', content: 'updated' }
    ]);
  });
  test('fourth update', async () => {
    await incidentFeed.update();
    expect(incidentFeed.getFeed()).toBe(fourthResponse.items);
    expect(incidentFeed.newIncidents()).toMatchObject([]);
    expect(incidentFeed.updatedIncidents()).toMatchObject([]);
  });
});

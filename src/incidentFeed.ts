import { isToday, isYesterday } from 'date-fns';
import { shell } from 'electron'; // tslint:disable-line no-implicit-dependencies
import { EventEmitter } from 'events';
import Parser from 'rss-parser';
import notify from './notify';

const FEED_URL = 'https://www.netlifystatus.com/history.rss';

interface IFeedItem {
  title: string;
  pubDate: string;
  content: string;
  link: string;
}

interface IConnection {
  isOnline: boolean;
}

export default class IncidentFeed extends EventEmitter {
  private parser: { parseURL(feedUrl: string) };
  private feed: IFeedItem[];

  constructor(connection: IConnection) {
    super();
    this.parser = new Parser();
    this.feed = [];
    let isInitialFetch = true;

    // main update loop for checking Netlify Incidents RSS
    const repeat = () => {
      setTimeout(
        async () => {
          if (connection.isOnline) {
            const fetchedFeed: IFeedItem[] = await this.fetchAndParseFeed();
            // on the first fetch, kee notify about any very recent updates...
            if (isInitialFetch) {
              this.feed = fetchedFeed;
              const recentIncidents = this.feed.filter(item => {
                const publicationDate = new Date(item.pubDate);
                return isToday(publicationDate) || isYesterday(publicationDate);
              });
              if (recentIncidents.length) {
                notify(
                  {
                    body: recentIncidents[0].title,
                    title: 'Recently reported incident'
                  },
                  () => {
                    shell.openExternal(recentIncidents[0].link);
                  }
                );
              }
              isInitialFetch = false;
            } else {
              // on subsequestion fetches, notify on new or updated incidents
              const newItems = this.findNewItems(fetchedFeed);
              const updatedItems = this.findUpdatedItems(fetchedFeed);
              newItems.forEach(item => {
                notify(
                  {
                    body: item.title,
                    title: 'New incident reported'
                  },
                  () => {
                    shell.openExternal(item.link);
                  }
                );
              });
              updatedItems.forEach(item => {
                notify(
                  {
                    body: item.title,
                    title: 'Incident updated'
                  },
                  () => {
                    shell.openExternal(item.link);
                  }
                );
              });
              this.feed = fetchedFeed;
            }
          }
          repeat();
        },
        // recheck connection every second, then poll every minute after initial fetch
        isInitialFetch ? 1000 : 60000
      );
    };
    repeat();
  }

  public getFeed(): ReadonlyArray<IFeedItem> {
    return this.feed as ReadonlyArray<IFeedItem>;
  }

  private async fetchAndParseFeed(): Promise<IFeedItem[]> {
    const response = await this.parser.parseURL(FEED_URL);
    return response.items;
  }

  private findNewItems(fetchedFeed: IFeedItem[]): IFeedItem[] {
    return fetchedFeed.filter(fetchedItem => {
      return !this.feed.some(item => {
        return item.link === fetchedItem.link;
      });
    });
  }

  private findUpdatedItems(fetchedFeed: IFeedItem[]): IFeedItem[] {
    return fetchedFeed.filter(fetchedItem => {
      return this.feed.find(item => {
        return (
          item.link === fetchedItem.link && item.content !== fetchedItem.content
        );
      });
    });
  }
}

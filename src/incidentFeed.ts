import { isToday, isYesterday } from 'date-fns';
import { Notification, shell } from 'electron'; // tslint:disable-line no-implicit-dependencies
import settings from 'electron-settings';
import { EventEmitter } from 'events';
import Parser from 'rss-parser';

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
              recentIncidents.forEach(item => {
                this.notify({
                  body: item.title,
                  link: item.link,
                  title: 'Recently reported incident'
                });
              });
              isInitialFetch = false;
            } else {
              // on subsequestion fetches, notify on new or updated incidents
              const newItems = this.findNewItems(fetchedFeed);
              const updatedItems = this.findUpdatedItems(fetchedFeed);
              newItems.forEach(item => {
                this.notify({
                  body: item.title,
                  link: item.link,
                  title: 'New incident reported'
                });
              });
              updatedItems.forEach(item => {
                this.notify({
                  body: item.title,
                  link: item.link,
                  title: 'Incident updated'
                });
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

  private notify({ body, title, link }): void {
    if (settings.get('showNotifications')) {
      const notification = new Notification({
        body,
        title
      });

      notification.on('click', () => {
        shell.openExternal(link);
      });

      // notifications with an attached click handler
      // won't disappear by itself
      // -> close it after certain timeframe automatically
      notification.on('show', () =>
        setTimeout(() => notification.close(), 4000)
      );
      notification.show();
    }
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

import Parser from 'rss-parser';

const FEED_URL = 'https://www.netlifystatus.com/history.rss';

interface IFeedItem {
  title: string;
  pubDate: string;
  content: string;
  link: string;
}

export default class IncidentFeed {
  private parser: { parseURL(feedUrl: string) };
  private currentFeed: IFeedItem[];
  private previousFeed: IFeedItem[];

  constructor() {
    this.parser = new Parser();
    this.currentFeed = [];
    this.previousFeed = [];
  }

  public async update(): Promise<any> {
    const fetchedFeed: IFeedItem[] = await this.fetchAndParseFeed();
    this.previousFeed = this.currentFeed;
    this.currentFeed = fetchedFeed;
  }

  public newIncidents(): ReadonlyArray<IFeedItem> {
    if (this.previousFeed.length === 0) {
      return [];
    }
    return this.currentFeed.filter(currentItem => {
      return !this.previousFeed.some(previousItem => {
        return previousItem.link === currentItem.link;
      });
    });
  }

  public updatedIncidents(): ReadonlyArray<IFeedItem> {
    return this.currentFeed.filter(currentItem => {
      return this.previousFeed.find(previousItem => {
        return (
          previousItem.link === currentItem.link &&
          previousItem.content !== currentItem.content
        );
      });
    });
  }

  public getFeed(): ReadonlyArray<IFeedItem> {
    return this.currentFeed as ReadonlyArray<IFeedItem>;
  }

  private async fetchAndParseFeed(): Promise<IFeedItem[]> {
    const response = await this.parser.parseURL(FEED_URL);
    return response.items;
  }
}

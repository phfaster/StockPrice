export interface StockPrice {
    time: number;
    timeString?: string;
    price: {
      Open: number,
      Close: number,
      High: number,
      Low: number,
      Volume: number
    };

    change: 1 | 0 | -1;

    error: any;  /* Error in getting actual price on home page */
    timeout?: number;  /* Time until the loss actual */
}

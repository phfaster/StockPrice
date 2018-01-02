# StockPrice
Stock Price is an application that provides real-time information about stock prices.

## Running
**WARNING: running was tested only on Unix systems. There may be a problem with running Nginx on Windows.**
1. Build Angular application with production environment:
*Root repository folder*
```
> cd front/
> ng build --prod
```
2. Run nginx server:
*Root repository folder*
```
> (sudo) npm run ngx
```
3. Run node server:
*Root repository folder*
```
> npm start
```
or
```
> forever start back/app.js
```
or
```
> node back/app.js
```
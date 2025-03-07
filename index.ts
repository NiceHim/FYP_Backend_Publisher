import dotenv from "dotenv";
import path from "path";
import { createClient } from 'redis';
import { PolygonClient } from "./src/utils/polygonClient";
import type IQuote from "./src/models/quote"; 
const env = process.env.NODE_ENV || "dev";
dotenv.config({ path: path.resolve(__dirname, `.env.${env}`) });

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const APIKEY = process.env.POLYGON_IO_API_KEY || "YOUR_API_KEY";
const throttle = 1000;
const quoteMap = new Map<string, IQuote>();
const publisher = createClient({ url: REDIS_URL });
publisher.connect().then(() => {
	const polygonWsClient = new PolygonClient({apiKey: APIKEY});
	polygonWsClient.subscribe(["C.EUR/USD,C.USD/JPY,C.GBP/USD,C.AUD/USD,C.USD/CAD"]);
	polygonWsClient.on("C", async (quote: IQuote) => {
		if (quoteMap.has(quote.p) == true) {
			const diffTimestamp = quote.t - quoteMap.get(quote.p)!.t;
			if (diffTimestamp >= throttle) {
				quoteMap.set(quote.p, quote);
				await publisher.publish("forex.quote", JSON.stringify(quote));
			}
		} else {
			quoteMap.set(quote.p, quote);
			await publisher.publish("forex.quote", JSON.stringify(quote));
		}
	})
});
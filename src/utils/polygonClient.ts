import lodash from 'lodash';
import WebSocket from 'ws';
import dotenv from "dotenv";
import { EventEmitter } from 'events';
dotenv.config();

class PolygonClient extends EventEmitter {
    ws: WebSocket | null;
    subscriptions: any[];
    apiKey: any;
    connected: any;
    
	constructor(params: { apiKey: any; }) {
		super();
		this.ws = null;
		this.subscriptions = [];
		this.apiKey = params.apiKey;
		this.connect();
	}

	subscribe(channels: any) {
		// Add to our list of subscriptions:
		this.subscriptions.push(channels);
		this.subscriptions = lodash.flatten(this.subscriptions);
		// If these are additional subscriptions, only send the new ones:
		if( this.connected ) this.sendSubscriptions(channels);
	}

	connect() {
		this.connected = false;
		this.ws = new WebSocket('wss://socket.polygon.io/forex')
		this.ws.on('open', this.onOpen.bind(this));
		this.ws.on('close', this.onDisconnect.bind(this));
		this.ws.on('disconnect', this.onDisconnect.bind(this));
		this.ws.on('error', this.onError.bind( this ));
		this.ws.on('message', this.onMessage.bind(this));
	}

	onOpen() {
		// Authenticate:
        if (this.ws) {
            this.ws.send(`{"action":"auth","params":"${this.apiKey}"}`);
        }
		this.connected = true;
		// Subscribe to Crypto Trades and SIP:
		this.sendSubscriptions(this.subscriptions);
	}

	sendSubscriptions(subscriptions: any[]) {
        if (this.ws) {
            this.ws.send(`{"action":"subscribe","params":"${subscriptions.join(',')}"}`);
        }
	}

	onDisconnect() {
		setTimeout(this.connect.bind(this), 2000);
	}

	onError(e: any) {
		console.log('Error:', e);
	}

	onMessage(data: any) {
		data = JSON.parse(data);
		data.forEach((msg: any) => {
			if( msg.ev === 'status' ) {
				console.log('Status Update:', msg.message);
			}
			this.emit(msg.ev, msg);
		})
	}
}

export { PolygonClient };
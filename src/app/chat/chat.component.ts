import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';  
import { Message } from './models/message';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  private client: Client;
  public connected: boolean;

  public message: Message = new Message();
  public messages: Message[] = [];

  public writingvalue: string;

  public clientId: string;

  constructor() {
    this.clientId = 'id-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2);
  }

  ngOnInit() {
    this.client = new Client();
    this.client.webSocketFactory= () => {
      return new SockJS('http://localhost:8080/chat-websocket');
    }

    this.client.onConnect = ( frame ) => {
      console.log('Connected: ' + this.client.connected + ' : ' + frame);
      this.connected = true;

      this.client.subscribe('/chat/message', e => {
        let message: Message = JSON.parse(e.body) as Message;
        message.date = new Date(message.date);

        if(!this.message.color && message.type == "CONNECTED" 
            && this.message.username == message.username) {
          this.message.color = message.color;
        }

        this.messages.push(message);
      });

      this.client.subscribe('/chat/writing', e => {
        this.writingvalue= e.body;
        setTimeout(() => this.writingvalue = '', 3000);
      });

      this.client.subscribe('/chat/history/' + this.clientId, e => {
        const history: Message[] = JSON.parse(e.body) as Message[];
        this.messages = history.map(m => {
          m.date = new Date(m.date);
          return m;
        }).reverse();
      });
      this.client.publish({destination: '/app/history', body: this.clientId});

      this.message.type = "CONNECTED";
      this.client.publish({destination: '/app/message', body: JSON.stringify(this.message)});
    }

    this.client.onDisconnect = ( frame ) => {
      console.log('Disconnected: ' + !this.client.connected + ' : ' + frame);
      this.message = new Message();
      this.messages = [];
      this.connected = false;
    }
  }

  connect() {
    this.client.activate();
  }

  disconnect() {
    this.client.deactivate();
  }

  writing() {
    this.client.publish({destination: '/app/writing', body: this.message.username});
  }

  send() {
    this.message.type = "MESSAGE";
    this.client.publish({destination: '/app/message', body: JSON.stringify(this.message)});
    this.message.message = '';
  }
}

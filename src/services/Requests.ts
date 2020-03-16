import { TraktAuth } from '../api/TraktAuth';
import { BrowserStorage } from './BrowserStorage';
import { Messaging } from './Messaging';

class _Requests {
  constructor() {
    this.send = this.send.bind(this);
    this.sendDirectly = this.sendDirectly.bind(this);
    this.fetch = this.fetch.bind(this);
    this.getOptions = this.getOptions.bind(this);
    this.getHeaders = this.getHeaders.bind(this);
  }

  async send(request: RequestDetails): Promise<string> {
    let responseText = '';
    if (browser.isBackgroundPage || request.url.includes(window.location.host)) {
      responseText = await this.sendDirectly(request);
    } else {
      const response = await Messaging.toBackground({ action: 'send-request', request });
      responseText = response as any as string;
      if (response.error) {
        throw response.error;
      }
    }
    return responseText;
  }

  async sendDirectly(request: RequestDetails): Promise<string> {
    let responseStatus = 0;
    let responseText = '';
    try {
      const response = await this.fetch(request);
      responseStatus = response.status;
      responseText = await response.text();
      if (responseStatus < 200 || responseStatus >= 400) {
        throw responseText;
      }
    } catch (err) {
      throw {
        request,
        status: responseStatus,
        text: responseText,
      };
    }
    return responseText;
  }

  async fetch(request: RequestDetails): Promise<Response> {
    let fetch = window.fetch;
    let options = await this.getOptions(request);
    if (window.wrappedJSObject) {
      // Firefox wraps page objects, so if we want to send the request from a container, we have to unwrap them.
      fetch = XPCNativeWrapper(window.wrappedJSObject.fetch);
      window.wrappedJSObject.fetchOptions = cloneInto(options, window);
      options = XPCNativeWrapper(window.wrappedJSObject.fetchOptions);
    }
    return fetch(request.url, options);
  }

  async getOptions(request: RequestDetails): Promise<GenericObject> {
    return {
      method: request.method,
      headers: await this.getHeaders(request),
      body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
    };
  }

  async getHeaders(request: RequestDetails): Promise<GenericObject> {
    const headers: GenericObject = {
      'Content-Type': typeof request.body === 'string' ? 'application/x-www-form-urlencoded' : 'application/json',
    };
    if (request.url.includes('trakt.tv')) {
      Object.assign(headers, TraktAuth.getHeaders());
      const values = await BrowserStorage.get('auth');
      if (values.auth && values.auth.access_token) {
        headers['Authorization'] = `Bearer ${values.auth.access_token}`;
      }
    }
    return headers;
  }
}

const Requests = new _Requests();

export { Requests };
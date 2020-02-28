class _BrowserStorage {
  constructor() {
    this.isSyncAvailable = !!browser.storage.sync;

    this.sync = this.sync.bind(this);
    this.set = this.set.bind(this);
    this.get = this.get.bind(this);
    this.remove = this.remove.bind(this);
    this.clear = this.clear.bind(this);
    this.getSize = this.getSize.bind(this);
    this.getOptions = this.getOptions.bind(this);
    this.getSyncOptions = this.getSyncOptions.bind(this);
  }

  /**
   * @returns {Promise}
   */
  async sync() {
    if (this.isSyncAvailable) {
      const values = await browser.storage.sync.get(null);
      for (const key of Object.keys(values)) {
        await browser.storage.local.set({ [key]: values[key] });
      }
    }
  }

  /**
   * @param {StorageValues} values
   * @param {boolean} doSync
   * @returns {Promise}
   */
  async set(values, doSync) {
    if (doSync && this.isSyncAvailable) {
      await browser.storage.sync.set(values);
    }
    await browser.storage.local.set(values);
  }

  /**
   * @param {string|Array<string>|Object<string, any>|null} keys
   * @returns {Promise<StorageValues>}
   */
  get(keys) {
    return browser.storage.local.get(keys);
  }

  /**
   * @param {string|Array<string>} keys
   * @param {boolean} doSync
   * @returns {Promise}
   */
  async remove(keys, doSync) {
    if (doSync && this.isSyncAvailable) {
      await browser.storage.sync.remove(keys);
    }
    await browser.storage.local.remove(keys);
  }

  /**
   * @param {boolean} doSync
   * @returns {Promise}
   */
  async clear(doSync) {
    if (doSync && this.isSyncAvailable) {
      await browser.storage.sync.clear();
    }
    await browser.storage.local.clear();
  }

  /**
   * @param {string|Array<string>|Object<string, any>|null} keys
   * @returns {Promise<string>}
   */
  async getSize(keys) {
    let size = '';
    const values = await this.get(keys);
    let bytes = (JSON.stringify(values) || '').length;
    if (bytes < 1024) {
      size = `${bytes.toFixed(2)} B`;
    } else {
      bytes /= 1024;
      if (bytes < 1024) {
        size = `${bytes.toFixed(2)} KB`;
      } else {
        bytes /= 1024;
        size = `${bytes.toFixed(2)} MB`;
      }
    }
    return size;
  }

  /**
   * @returns {Promise<Object>}
   */
  async getOptions() {
    const options = {
      sendReceiveSuggestions: {
        id: 'sendReceiveSuggestions',
        name: '',
        description: '',
        value: false,
        origins: ['*://script.google.com/*', '*://script.googleusercontent.com/*'],
      },
      allowRollbar: {
        id: 'allowRollbar',
        name: '',
        description: '',
        value: false,
        origins: ['*://api.rollbar.com/*'],
      },
    };
    const values = await BrowserStorage.get('options');
    for (const option of Object.values(options)) {
      option.name = browser.i18n.getMessage(`${option.id}Name`);
      option.description = browser.i18n.getMessage(`${option.id}Description`);
      option.value = (values.options && values.options[option.id]) || option.value;
    }
    return options;
  }

  /**
   * @returns {Promise<Object>}
   */
  async getSyncOptions() {
    const options = {
      hideSynced: {
        id: 'hideSynced',
        name: '',
        value: false,
        type: 'boolean',
      },
      use24Clock: {
        id: 'use24Clock',
        name: '',
        value: false,
        type: 'boolean',
      },
      addWithReleaseDate: {
        id: 'addWithReleaseDate',
        name: '',
        value: false,
        type: 'boolean',
      },
      itemsPerLoad: {
        id: 'itemsPerLoad',
        name: '',
        value: 10,
        type: 'number',
      },
    };
    const values = await BrowserStorage.get('syncOptions');
    for (const option of Object.values(options)) {
      option.name = browser.i18n.getMessage(`${option.id}Name`);
      option.value = (values.syncOptions && values.syncOptions[option.id]) || option.value;
    }
    return options;
  }
}

const BrowserStorage = new _BrowserStorage();

export { BrowserStorage };
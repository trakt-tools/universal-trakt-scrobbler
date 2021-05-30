// This is the file that is loaded in the service page as a content script.

import { init } from '../common/content';

// You only need to import the `*Events` class, because it imports the `*Parser` class, which, in turn, imports  the `*Api` class.
import './ScrobblerTemplateEvents';

// This function prevents us from writing duplicate code, as it already initializes everything that should be enough to make most scrobblers work out of the box. You can always not use it and implement your own init function.
// @ts-expect-error
void init('scrobbler-template');

// This is the file that is loaded in the service page as a content script.

import { init } from '../common/content';

// Import all files that are required for the scrobbler to work here. Since './ScrobblerTemplateParser' already imports './ScrobblerTemplateApi', we do not need to import it twice.
import './DisneyplusEvents';
import './DisneyplusParser';

// This function prevents us from writing duplicate code, as it already initializes everything that should be enough to make most scrobblers work out of the box. You can always not use it and implement your own init function.
void init('disneyplus');

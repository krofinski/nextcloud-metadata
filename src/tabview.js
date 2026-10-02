import { getSidebar, FileType } from '@nextcloud/files'
import { generateUrl, imagePath } from "@nextcloud/router"
import { getRequestToken } from '@nextcloud/auth'
import { t } from '@nextcloud/l10n'

import MetadataIconSvg from './info.svg' with { type: "text" }

class MetadataTabView extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = '<div style="text-align:center; word-wrap:break-word;" class="metadata-tab-view get-metadata"><p><br><img src="'
            + imagePath('core', 'loading.gif')
            + '"><br><br></p><p>'
            + t('metadata', 'Reading metadata …')
            + '</p></div>';

        var url = generateUrl('/apps/metadata/get'),
            data = {source: this.node.dirname + '/' + this.node.basename},
            _self = this;
        getJson(url, data, {requesttoken: getRequestToken() || ''})
            .then(function(data) {
                _self.updateDisplay(data);
            })
            .catch(function(error) {
                console.error(error);
            });
    }

    formatValue(value) {
        return Array.isArray(value) ? value.join('; ') : value;
    }

    updateDisplay(data) {
        var table;
        var showLocation = false;

        if (data.response === 'success') {
            table = document.createElement('table');

            var metadata = data.metadata;
            for (var m in metadata) {
                table.append(createRow(m + ':', this.formatValue(metadata[m])));
            }

            showLocation = (data.loc !== null) || ((data.lat !== null) && (data.lon !== null));
            if (showLocation) {
                var location;

                if (data.loc !== null) {
                    var address = [];
                    this.add(data.loc.city, address);
                    this.add(data.loc.state, address);
                    this.add(data.loc.country, address);
                    location = address.join(', ');

                } else {
                    location = t('metadata', 'Resolving, click here to view on map …');
                }

                if ((data.lat !== null) && (data.lon !== null)) {
                    var url = 'https://nominatim.openstreetmap.org/reverse',
                        params = {lat: data.lat, lon: data.lon, format: 'json', zoom: 18},
                        _self = this;
                    getJson(url, params)
                        .then(function(data) {
                            _self.updateLocation(data);
                        })
                        .catch(function() {
                            if (data.loc === null) {
                                _self.updateLocation({error: t('metadata', 'Nominatim service unavailable, click here to view on map')});
                            }
                        });
                }

                var link = document.createElement('a');
                link.href = '#';
                link.className = 'get-location';
                link.textContent = location;

                table.append(createRow(t('metadata', 'Location') + ':', link));
            }

        } else {
            table = document.createElement('p');
            table.textContent = data.msg;
        }

        var container = this.querySelector('.get-metadata');
        if (!container) {
            return;
        }
        container.replaceChildren(table);

        if (showLocation) {
            var _self = this;

            this.querySelector('.get-location')
                .addEventListener('click', function(event) {
                    event.preventDefault();

                    if ((data.lat === null) || (data.lon === null)) {
                        var url = 'https://nominatim.openstreetmap.org/search',
                            params = {city: data.loc.city, state: data.loc.state, country: data.loc.country, format: 'json', limit: 1};
                        getJson(url, params)
                            .then(function(data) {
                                if (data.length > 0) {
                                    _self.showMap(data[0]);

                                } else {
                                    console.log(t('metadata', 'Location could not be determined'));
                                }
                            })
                            .catch(function() {
                                console.log(t('metadata', 'Nominatim service unavailable'));
                            });

                    } else {
                        _self.showMap(data);
                    }
                });
        }
    }

    showMap(data) {
        var bbox = [data.lon - 0.0051, data.lat - 0.0051, data.lon - -0.0051, data.lat - -0.0051];

        var iframe = document.createElement('iframe');
        iframe.setAttribute('width', '100%');
        iframe.setAttribute('height', '100%');
        iframe.setAttribute('src', 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox.join() + '&marker=' + data.lat + ',' + data.lon);

        iframe.style.border = 'none';

        var closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'metadata-map-close';
        closeButton.setAttribute('aria-label', t('metadata', 'Close'));
        closeButton.textContent = '\u2715';

        var header = document.createElement('div');
        header.className = 'metadata-map-header';
        var title = document.createElement('span');
        title.textContent = 'OpenStreetMap';
        header.append(title, closeButton);

        var body = document.createElement('div');
        body.className = 'metadata-map-body';
        body.style.background = 'url(' + imagePath('core', 'loading.gif') + ') center center no-repeat';
        body.append(iframe);

        var dialog = document.createElement('dialog');
        dialog.className = 'metadata-map-dialog';
        dialog.append(header, body);

        closeButton.addEventListener('click', function() {
            dialog.close();
        });
        // Close when clicking on the backdrop
        dialog.addEventListener('click', function(event) {
            if (event.target === dialog) {
                dialog.close();
            }
        });
        dialog.addEventListener('close', function() {
            dialog.remove();
        });

        document.body.append(dialog);
        dialog.showModal();
    }

    updateLocation(data) {
        var text = '';

        if (data.error) {
            text = data.error;

        } else {
            var location = data.address;
            var address = [];
            this.add(location.building || location.attraction || location.artwork || location.monument || location.viewpoint || location.museum || location.cafe || location.shop || location.garden || location.aerodrome || location.address29 || location.house_number, address);
            this.add(location.road || location.pedestrian || location.path || location.steps || location.footway || location.cycleway || location.bridleway || location.construction, address);
            this.add(location.city || location.town || location.village || location.hamlet || location.isolated_dwelling, address);
            this.add(location.country, address);
            text = address.join(', ');
        }

        var link = this.querySelector('.get-location');
        if (link) {
            link.textContent = text;
        }
    }

    add(val, array) {
        if (val) {
            array.push(val);
        }
    }
}

function getJson(url, params, headers) {
    var query = new URLSearchParams();
    for (var key in params) {
        var value = params[key];
        query.append(key, (value === null || value === undefined) ? '' : value);
    }

    return fetch(url + '?' + query, {
        method: 'GET',
        headers: Object.assign({Accept: 'application/json'}, headers || {}),
    }).then(function(response) {
        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ' for ' + url);
        }
        return response.json();
    });
}

function createRow(key, value) {
    var keyCell = document.createElement('td');
    keyCell.className = 'key';
    keyCell.textContent = key;

    var valueCell = document.createElement('td');
    valueCell.className = 'value';
    if (value instanceof Node) {
        valueCell.append(value);
    } else {
        valueCell.textContent = (value === null || value === undefined) ? '' : value;
    }

    var row = document.createElement('tr');
    row.append(keyCell, valueCell);
    return row;
}

getSidebar().registerTab({
    id: 'metadata',
    displayName: t('metadata', 'Metadata'),
    iconSvgInline: MetadataIconSvg,
    order: 70,
    tagName: 'metadata-files-sidebar-tab',

    enabled({ node }) {
        if (node.type === FileType.File) {
            return (['audio/flac', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav',
                'image/gif', 'image/heic', 'image/jpeg', 'image/png', 'image/tiff', 'image/x-dcraw',
                'video/3gpp', 'video/dvd', 'video/MP2T', 'video/mp4', 'video/mpeg', 'video/quicktime',
                'video/webm', 'video/x-flv', 'video/x-matroska', 'video/x-msvideo',
                'application/pdf', 'application/zip'].indexOf(node.mime) > -1);
        }

        return false;
    },

    onInit() {
        customElements.define('metadata-files-sidebar-tab', MetadataTabView)
    }
});

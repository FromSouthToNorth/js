export function rendererBackground(context) {

  function background() {
    const accessToken = 'pk.eyJ1IjoiaHlzZSIsImEiOiJjbGVwcWg0bDkwZXNlM3pvNXNleWUzcTQ0In0.S3VTf9vqYTAAF725ukcDjQ';
    const mapboxStreets = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token={accessToken}', {
      maxZoom: 19,
      attribution: '© mapbox',
      accessToken,
    });
    const mapboxSatellite = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token={accessToken}', {
      maxZoom: 19,
      attribution: '© mapbox',
      accessToken,
    });
    const mapboxSatelliteStreets = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token={accessToken}', {
      maxZoom: 19,
      attribution: '© mapbox',
      accessToken,
    });

    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    });

    const services = L.tileLayer(`https://services.digitalglobe.com/earthservice/tmsaccess/tms/1.0.0/DigitalGlobe:ImageryTileService@EPSG:3857@jpg/{z}/{x}/{y}.jpg?connectId={connectId}`, {
      maxZoom: 18,
      tms: true,
      connectId: 'c2cbd3f2-003a-46ec-9e46-26a3996d6484',
    });

    const baseMaps = {
      'mapboxStreets': mapboxStreets,
      'mapboxSatellite': mapboxSatellite,
      'mapboxSatelliteStreets': mapboxSatelliteStreets,
      'OpenStreetMap': osm,
      'services': services,
    };

    L.control.layers.minimap(baseMaps, {}, {
      collapsed: false,
    }).addTo(context.map());
    baseMaps['mapboxStreets'].addTo(context.map());
  }

  return background;

}

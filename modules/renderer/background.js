export function rendererBackground(context) {

  function background() {
    const accessToken = 'pk.eyJ1IjoiaHlzZSIsImEiOiJjbGVwcWg0bDkwZXNlM3pvNXNleWUzcTQ0In0.S3VTf9vqYTAAF725ukcDjQ';
    // https://api.mapbox.com/styles/v1/openstreetmap/ckasmteyi1tda1ipfis6wqhuq/tiles/256/12/3431/1760?access_token=pk.eyJ1Ijoib3BlbnN0cmVldG1hcCIsImEiOiJjbGRlaXd3cHUwYXN3M29waWp0bGNnYWdyIn0.RRlhUnKlUFNhKsKjhaZ2zA
    const position = L.tileLayer(' https://api.mapbox.com/styles/v1/openstreetmap/ckasmteyi1tda1ipfis6wqhuq/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      maxZoom: 19,
      attribution: '© mapbox',
      accessToken,
    })
    const mapboxStreets = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token={accessToken}', {
      maxZoom: 19,
      attribution: '© mapbox',
      accessToken,
    });
    const mapboxSatellite = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token={accessToken}', {
      maxZoom: 19,
      attribution: '© mapbox',
      accessToken,
    });
    const mapboxSatelliteStreets = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token={accessToken}', {
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
      'position': position,
      'MapboxStreets': mapboxStreets,
      'MapboxSatellite': mapboxSatellite,
      'MapboxSatelliteStreets': mapboxSatelliteStreets,
      'OpenStreetMap': osm,
      'Services': services,
    };

    L.control.layers.minimap(baseMaps, {}, {
      collapsed: true,
    }).addTo(context.map());
    baseMaps['position'].addTo(context.map());
  }

  return background;

}

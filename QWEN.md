# Visor de Mapas - QWEN Context

## Project Overview

This is a web-based map viewer application called "Visor de Mapas" that allows users to visualize geospatial data on a custom image-based map. The application is built using HTML, CSS, and JavaScript, leveraging Leaflet.js for map functionality, Bootstrap for UI components, and additional libraries for handling ZIP files and coordinate projections.

### Key Technologies and Libraries
- **HTML5/CSS3/JavaScript ES6+**: Core web technologies
- **Leaflet.js**: Interactive map library (loaded from unpkg.com)
- **Bootstrap 5.3.2**: UI framework (CSS and JS)
- **Font Awesome 6.0.0**: Icon set
- **JSZip 3.10.1**: Processing ZIP files containing data
- **Proj4js 2.11.0**: Coordinate system projections (PSAD56 UTM Zone 17S)
- **Custom CSS**: For marker styling and UI enhancements

### Core Functionality

#### Map Visualization
- Displays a custom image (RAC-FOT.jpg) as the base map using Leaflet's Simple CRS
- Supports PSAD56 coordinate system (EPSG:24877 - UTM Zone 17S South)
- Shows data points as color-coded markers based on 'tag' property (rutina/blue, novedad/yellow, importante/red)

#### Data Input
- Accepts ZIP files containing JSON data files with geospatial information
- Can process either individual ZIP files or entire directories of ZIP files
- Data is expected to include coordinates in PSAD56 format, timestamps, tags, and optional photos

#### Filtering and Configuration
- **Filter Tab**: Allows filtering by date range, 'workFront', and 'tag' properties
- **Configuration Tab**: Allows selecting source ZIP files or directories
- **Local Storage**: Remembers selected folder paths and file counts between sessions

#### Features
- Interactive markers with tooltips and popups showing detailed information
- Clickable photo thumbnails in popups with enlarge functionality
- Duplicate data removal based on IDs
- Refresh functionality to reload data from selected folders
- Responsive UI with Bootstrap navigation

## Project Structure

```
├── index.html          # Main HTML file containing the UI structure
├── RAC-FOT.jpg         # The base map image
├── .gitattributes      # Git attributes configuration
├── css/
│   └── style.css       # Custom CSS for styling markers and UI elements
├── js/
│   └── app.js          # Main JavaScript application logic
├── data/               # Currently empty, potentially for data files
├── img/
│   └── RAC-FOT.jpg     # Copy of the base map image
└── .git/               # Git repository metadata
```

## Key JavaScript Components

### Map Configuration
- PSAD56 bounds defined for coordinate transformation
- Simple CRS used for image overlay
- Fixed bounds for the custom map image

### Data Processing
- ZIP file processing with JSZip library
- JSON parsing from within ZIP archives
- Coordinate transformation from PSAD56 to image pixel coordinates
- Duplicate removal based on ID or coordinate combination

### UI Controls
- Tab system for Map/Filters/Configuration views
- Filter controls for date ranges, workFronts, and tags
- Folder/file selection with webkitdirectory support
- Refresh button for reloading data

## Building and Running

This is a client-side only application that can be run directly in a web browser:

1. Simply open `index.html` in a modern web browser
2. No build process or server required for basic operation
3. The application uses CDN-hosted dependencies (Leaflet, Bootstrap, JSZip, etc.)

### Browser Compatibility
- Requires modern browser with support for:
  - HTML5 File API
  - JavaScript ES6+ features
  - Webkit directory access for folder selection
  - Local Storage API

## Development Conventions

### Coordinate System
- Uses PSAD56 / UTM Zone 17S (EPSG:24877)
- Bounds are hardcoded in the application: minX: 780288.674, maxX: 782454.261, minY: 9603950.033, maxY: 9602217.563
- Coordinates are transformed to image pixel coordinates for display

### Data Format
- JSON data files expected inside ZIP archives
- Expected properties include `coordinates.psad56.easting/northing`, `datetime`, `tag`, `workFront`
- Optional properties: `id`, `notes`, `location`, `photoFileNames`, `zip` reference

### Marker Styling
- Color-coded markers based on `tag` property:
  - `rutina` (routine): Blue
  - `novedad` (novelty): Yellow  
  - `importante` (important): Red
  - Default: Blue if no tag matches

## Special Considerations

### Security
- Uses Content Security Policy allowing specific CDN sources
- File access limited to user-selected directories/files via browser APIs
- No server-side processing required

### Performance
- All processing happens client-side in the browser
- May be limited by browser memory when processing large ZIP files
- Uses efficient filtering algorithms to handle large datasets

### Data Persistence
- Uses localStorage to remember selected folder paths between sessions
- Does not persist processed data - reprocessing required on page reload
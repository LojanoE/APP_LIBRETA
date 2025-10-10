document.addEventListener('DOMContentLoaded', () => {
    const psad56Bounds = {
        minX: 780470.010,
        maxX: 782341.423,
        minY: 9603738.377,
        maxY: 9602159.372
    };

    // Define PSAD56 projection for proj4
    proj4.defs("EPSG:24877", "+proj=utm +zone=17 +south +ellps=intl +towgs84=-288,175,-376,0,0,0,0 +units=m +no_defs");

    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -5
    });

    const imageUrl = 'img/RAC-FOT.jpg';
    const image = new Image();
    image.src = imageUrl;

    image.onload = function () {
        const width = this.width;
        const height = this.height;
        const imageBounds = [[0, 0], [height, width]];

        L.imageOverlay(imageUrl, imageBounds).addTo(map);
        map.fitBounds(imageBounds);

        // Restore previously selected folder path from localStorage
        const savedFolderPath = localStorage.getItem('selectedFolderPath');
        if (savedFolderPath) {
            document.getElementById('selected-folder-path').value = savedFolderPath;
        }

        // Variables to store folder files
        let folderFiles = [];

        // Handle folder selection (function called from HTML)
        window.handleFolderSelection = function(event) {
            const files = Array.from(event.target.files);
            folderFiles = files.filter(file => file.name.toLowerCase().endsWith('.zip'));
            
            if (files.length > 0) {
                const firstFilePath = files[0].webkitRelativePath;
                const folderPath = firstFilePath.substring(0, firstFilePath.indexOf('/')) || firstFilePath.substring(0, firstFilePath.indexOf('\\')) || 'Carpeta seleccionada';
                document.getElementById('selected-folder-path').value = folderPath;
                
                // Save folder path to localStorage
                localStorage.setItem('selectedFolderPath', folderPath);
            } else {
                document.getElementById('selected-folder-path').value = '';
                localStorage.removeItem('selectedFolderPath'); // Clear saved path if no folder selected
                addMarkers([], width, height);
                return;
            }

            if (folderFiles.length === 0) {
                alert('No se encontraron archivos .zip en la carpeta seleccionada.');
                allData = [];
                addMarkers([], width, height);
                return;
            }

            allData = []; // Reiniciar datos
            const promises = folderFiles.map(file =>
                JSZip.loadAsync(file).then(zip => {
                    const jsonFile = Object.keys(zip.files).find(filename => filename.toLowerCase().endsWith('.json'));
                    if (!jsonFile) {
                        console.warn(`No .json file found in ${file.name}`);
                        return;
                    }
                    return zip.file(jsonFile).async('string').then(content => {
                        try {
                            const data = JSON.parse(content);
                            if (Array.isArray(data)) {
                                data.forEach(item => item.zip = zip); // Augment data
                                allData = allData.concat(data);
                            }
                        } catch (e) {
                            console.error(`Error parsing JSON from ${file.name}:`, e);
                        }
                    });
                })
            );

            Promise.all(promises).then(() => {
                if (allData.length > 0) {
                    // Remove duplicates based on ID
                    allData = removeDuplicateIds(allData);
                    filteredData = [...allData]; // Inicialmente todos los datos filtrados
                    addMarkers(filteredData, width, height);
                    updateFilterResults(); // Actualizar contador de resultados
                    showTab('map');
                } else {
                    alert('No se encontraron datos de marcadores válidos en los archivos ZIP.');
                }
            }).catch(err => {
                console.error("Error processing ZIP files:", err);
                alert("Error al leer uno o más archivos ZIP.");
            });
        };
        
        // Handle direct zip file selection (function called from HTML)
        window.handleDirectFileSelection = function(event) {
            const file = event.target.files[0];
            if (file) {
                document.getElementById('selected-folder-path').value = file.name; // Show file name
                
                // Save file name to localStorage as the "folder path"
                localStorage.setItem('selectedFolderPath', file.name);
                
                JSZip.loadAsync(file).then((zip) => {
                    const jsonFile = Object.keys(zip.files).find(filename => filename.toLowerCase().endsWith('.json'));
                    if (jsonFile) {
                        zip.file(jsonFile).async('string').then((content) => {
                            try {
                                const data = JSON.parse(content);
                                if (Array.isArray(data)) {
                                    data.forEach(item => item.zip = zip); // Augment data
                                    // Remove duplicates based on ID
                                    allData = removeDuplicateIds(data);
                                    filteredData = [...allData]; // Inicialmente todos los datos filtrados
                                    addMarkers(filteredData, width, height);
                                    updateFilterResults(); // Actualizar contador de resultados
                                    showTab('map');
                                } else {
                                    alert('El formato del archivo JSON no es el esperado.');
                                }
                            } catch(e) {
                                alert('Error al parsear el archivo JSON.');
                                console.error("JSON parsing error:", e);
                            }
                        });
                    } else {
                        alert('No se encontró ningún archivo JSON en el ZIP.');
                    }
                });
            }
        };
        

    };

    // Variables para almacenar los datos y filtros
    let allData = [];
    let filteredData = [];
    let currentImageWidth = 0;
    let currentImageHeight = 0;
    
    // Función para mostrar la pestaña correspondiente
    window.showTab = function(tabName) {
        // Ocultar todos los contenedores de pestañas
        document.getElementById('map-tab').style.display = 'none';
        document.getElementById('filters-tab').style.display = 'none';
        document.getElementById('config-tab').style.display = 'none';
        
        // Mostrar el contenedor de la pestaña seleccionada
        if (tabName === 'map') {
            document.getElementById('map-tab').style.display = 'block';
            document.getElementById('map').style.height = 'calc(100vh - 56px)';
        } else if (tabName === 'filters') {
            document.getElementById('filters-tab').style.display = 'block';
            // Actualizar el selector de workfronts con los disponibles
            updateWorkfrontOptions();
        } else if (tabName === 'config') {
            document.getElementById('config-tab').style.display = 'block';
        }
    };
    
    // Function to remove duplicate items based on ID
    function removeDuplicateIds(data) {
        const seenIds = new Set();
        return data.filter(item => {
            // Use a combination of id and other identifying fields if id alone isn't sufficient
            const id = item.id || `${item.datetime || ''}_${item.coordinates?.psad56?.easting || ''}_${item.coordinates?.psad56?.northing || ''}`;
            if (seenIds.has(id)) {
                return false; // Skip duplicate
            }
            seenIds.add(id);
            return true; // Keep unique item
        });
    }
    
    // Function to update the workfront options in the filter dropdown
    function updateWorkfrontOptions() {
        const workfrontSelect = document.getElementById('workfront-select');
        // Clear existing options except the first one
        workfrontSelect.innerHTML = '<option value="">Todos los WorkFronts</option>';
        
        // Get unique workfronts from allData
        const workfronts = [...new Set(allData.map(item => item.workFront).filter(wf => wf))];
        workfronts.sort(); // Sort alphabetically
        
        // Add options to the select
        workfronts.forEach(workfront => {
            const option = document.createElement('option');
            option.value = workfront;
            option.textContent = workfront;
            workfrontSelect.appendChild(option);
        });
    }
    
    // Function to apply filters
    function applyFilters() {
        const datetimeFrom = document.getElementById('datetime-from').value;
        const datetimeTo = document.getElementById('datetime-to').value;
        const workfrontValue = document.getElementById('workfront-select').value;
        
        // Start with all data
        filteredData = [...allData];
        
        // Apply datetime filters
        if (datetimeFrom) {
            const fromDate = new Date(datetimeFrom);
            filteredData = filteredData.filter(item => {
                if (item.datetime) {
                    const itemDate = new Date(item.datetime);
                    return itemDate >= fromDate;
                }
                return true;
            });
        }
        
        if (datetimeTo) {
            const toDate = new Date(datetimeTo);
            filteredData = filteredData.filter(item => {
                if (item.datetime) {
                    const itemDate = new Date(item.datetime);
                    return itemDate <= toDate;
                }
                return true;
            });
        }
        
        // Apply workfront filter
        if (workfrontValue) {
            filteredData = filteredData.filter(item => item.workFront === workfrontValue);
        }
        
        // Update the map with filtered data
        addMarkers(filteredData, currentImageWidth, currentImageHeight);
        updateFilterResults();
    }
    
    // Function to update the filter results display
    function updateFilterResults() {
        const filterResults = document.getElementById('filter-results');
        if (allData.length === 0) {
            filterResults.textContent = 'No hay datos para mostrar';
            filterResults.className = 'alert alert-info';
        } else if (filteredData.length === allData.length) {
            filterResults.textContent = `Mostrando todos los ${allData.length} registros`;
            filterResults.className = 'alert alert-info';
        } else {
            filterResults.textContent = `Mostrando ${filteredData.length} de ${allData.length} registros`;
            filterResults.className = 'alert alert-success';
        }
    }
    
    // Function to clear filters
    function clearFilters() {
        document.getElementById('datetime-from').value = '';
        document.getElementById('datetime-to').value = '';
        document.getElementById('workfront-select').value = '';
        filteredData = [...allData]; // Reset to all data
        addMarkers(filteredData, currentImageWidth, currentImageHeight);
        updateFilterResults();
    }
    
    // Initialize filter event listeners
    function initFilterControls() {
        document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
        document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);
        
        // Also apply filters when changing datetime fields
        document.getElementById('datetime-from').addEventListener('change', applyFilters);
        document.getElementById('datetime-to').addEventListener('change', applyFilters);
        document.getElementById('workfront-select').addEventListener('change', applyFilters);
    }
    
    function addMarkers(data, imageWidth, imageHeight) {
        // Store current dimensions for later use
        currentImageWidth = imageWidth;
        currentImageHeight = imageHeight;
        
        // Clear existing markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        if (!Array.isArray(data)) {
            if (data && data.length > 0) alert('El formato de datos no es el esperado (se esperaba un array).');
            return;
        }

        data.forEach((item) => {
            if (!item.coordinates || !item.coordinates.psad56) return;

            const easting = item.coordinates.psad56.easting;
            const northing = item.coordinates.psad56.northing;
            
            const x_pixel = imageWidth * (easting - psad56Bounds.minX) / (psad56Bounds.maxX - psad56Bounds.minX);
            const y_pixel = imageHeight * (psad56Bounds.maxY - northing) / (psad56Bounds.maxY - psad56Bounds.minY);

            if (x_pixel >= 0 && x_pixel <= imageWidth && y_pixel >= 0 && y_pixel <= imageHeight) {
                
                const markerType = (item.tag || 'rutina').toLowerCase(); // Default to 'rutina' and ensure lowercase
                const customIcon = L.divIcon({
                    className: `custom-div-icon ${markerType}`,
                    html: `<div class="marker-pin"></div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                });

                const marker = L.marker([y_pixel, x_pixel], { icon: customIcon }).addTo(map);

                // Tooltip
                if(item.notes) {
                    marker.bindTooltip(item.notes.substring(0, 30) + (item.notes.length > 30 ? '...' : ''));
                } else if(item.datetime) {
                    marker.bindTooltip(item.datetime);
                } else if (item.id) {
                    marker.bindTooltip(`ID: ${item.id}`);
                }

                marker.on('click', function () {
                    let popupContent = '<ul>';
                    for (const key in item) {
                        if (['coordinates', 'location', 'zip', 'photoFileNames', 'tag'].indexOf(key) === -1) {
                            let value = item[key];
                            if (Array.isArray(value)) value = value.join(', ');
                            popupContent += `<li><strong>${key}:</strong> ${value}</li>`;
                        }
                    }
                    popupContent += '</ul>';
                    if (item.location) popupContent += `<p><strong>Ubicación:</strong> ${item.location}</p>`;
                    if (item.tag) popupContent += `<p><strong>Tag:</strong> ${item.tag}</p>`;

                    marker.unbindPopup();
                    marker.bindPopup(popupContent).openPopup();

                    if (item.zip && item.photoFileNames && item.photoFileNames.length > 0) {
                        marker.setPopupContent(popupContent + "<p>Cargando fotos...</p>");

                        const photoPromises = item.photoFileNames.map(photoName => {
                            const imageFile = item.zip.file(photoName);
                            if (imageFile) {
                                return imageFile.async('base64').then(base64data => `data:image/jpeg;base64,${base64data}`);
                            }
                            return Promise.resolve(null);
                        });

                        Promise.all(photoPromises).then(imageUrls => {
                            let imagesHtml = '<div class="popup-photos-flex-container">';
                            imageUrls.forEach(url => {
                                if (url) {
                                    imagesHtml += `<div class="photo-thumbnail-container"><img src="${url}" class="popup-photo-thumbnail" alt="foto"></div>`;
                                }
                            });
                            imagesHtml += '</div>';
                            marker.setPopupContent(popupContent + imagesHtml);
                        });
                    }
                });

                marker.on('popupopen', function(e) {
                    const popupElement = e.popup.getElement();
                    if (!popupElement) return;

                    popupElement.addEventListener('click', function(event) {
                        if (event.target.matches('.popup-photo-thumbnail')) {
                            const thumb = event.target;
                            const enlargedView = document.createElement('div');
                            enlargedView.className = 'enlarged-photo-view';
                            
                            const enlargedImg = document.createElement('img');
                            enlargedImg.src = thumb.src;
                            
                            enlargedView.appendChild(enlargedImg);
                            
                            enlargedView.addEventListener('click', function() {
                                enlargedView.remove();
                            });

                            document.body.appendChild(enlargedView);
                        }
                    });
                });
            }
        });
    }
    
    // Initialize filter controls when the image is loaded
    image.onload = function () {
        const width = this.width;
        const height = this.height;
        const imageBounds = [[0, 0], [height, width]];

        L.imageOverlay(imageUrl, imageBounds).addTo(map);
        map.fitBounds(imageBounds);

        // Restore previously selected folder path from localStorage
        const savedFolderPath = localStorage.getItem('selectedFolderPath');
        if (savedFolderPath) {
            document.getElementById('selected-folder-path').value = savedFolderPath;
        }
        
        // Initialize filter controls
        initFilterControls();

        // Variables to store folder files
        let folderFiles = [];

        // Handle folder selection (function called from HTML)
        window.handleFolderSelection = function(event) {
            const files = Array.from(event.target.files);
            folderFiles = files.filter(file => file.name.toLowerCase().endsWith('.zip'));
            
            if (files.length > 0) {
                const firstFilePath = files[0].webkitRelativePath;
                const folderPath = firstFilePath.substring(0, firstFilePath.indexOf('/')) || firstFilePath.substring(0, firstFilePath.indexOf('\\')) || 'Carpeta seleccionada';
                document.getElementById('selected-folder-path').value = folderPath;
                
                // Save folder path to localStorage
                localStorage.setItem('selectedFolderPath', folderPath);
            } else {
                document.getElementById('selected-folder-path').value = '';
                localStorage.removeItem('selectedFolderPath'); // Clear saved path if no folder selected
                allData = [];
                addMarkers([], width, height);
                return;
            }

            if (folderFiles.length === 0) {
                alert('No se encontraron archivos .zip en la carpeta seleccionada.');
                allData = [];
                addMarkers([], width, height);
                return;
            }

            allData = []; // Reiniciar datos
            const promises = folderFiles.map(file =>
                JSZip.loadAsync(file).then(zip => {
                    const jsonFile = Object.keys(zip.files).find(filename => filename.toLowerCase().endsWith('.json'));
                    if (!jsonFile) {
                        console.warn(`No .json file found in ${file.name}`);
                        return;
                    }
                    return zip.file(jsonFile).async('string').then(content => {
                        try {
                            const data = JSON.parse(content);
                            if (Array.isArray(data)) {
                                data.forEach(item => item.zip = zip); // Augment data
                                allData = allData.concat(data);
                            }
                        } catch (e) {
                            console.error(`Error parsing JSON from ${file.name}:`, e);
                        }
                    });
                })
            );

            Promise.all(promises).then(() => {
                if (allData.length > 0) {
                    // Remove duplicates based on ID
                    allData = removeDuplicateIds(allData);
                    filteredData = [...allData]; // Inicialmente todos los datos filtrados
                    addMarkers(filteredData, width, height);
                    updateFilterResults(); // Actualizar contador de resultados
                    showTab('map');
                } else {
                    alert('No se encontraron datos de marcadores válidos en los archivos ZIP.');
                }
            }).catch(err => {
                console.error("Error processing ZIP files:", err);
                alert("Error al leer uno o más archivos ZIP.");
            });
        };
        
        // Handle direct zip file selection (function called from HTML)
        window.handleDirectFileSelection = function(event) {
            const file = event.target.files[0];
            if (file) {
                document.getElementById('selected-folder-path').value = file.name; // Show file name
                
                // Save file name to localStorage as the "folder path"
                localStorage.setItem('selectedFolderPath', file.name);
                
                JSZip.loadAsync(file).then((zip) => {
                    const jsonFile = Object.keys(zip.files).find(filename => filename.toLowerCase().endsWith('.json'));
                    if (jsonFile) {
                        zip.file(jsonFile).async('string').then((content) => {
                            try {
                                const data = JSON.parse(content);
                                if (Array.isArray(data)) {
                                    data.forEach(item => item.zip = zip); // Augment data
                                    // Remove duplicates based on ID
                                    allData = removeDuplicateIds(data);
                                    filteredData = [...allData]; // Inicialmente todos los datos filtrados
                                    addMarkers(filteredData, width, height);
                                    updateFilterResults(); // Actualizar contador de resultados
                                    showTab('map');
                                } else {
                                    alert('El formato del archivo JSON no es el esperado.');
                                }
                            } catch(e) {
                                alert('Error al parsear el archivo JSON.');
                                console.error("JSON parsing error:", e);
                            }
                        });
                    } else {
                        alert('No se encontró ningún archivo JSON en el ZIP.');
                    }
                });
            }
        };
        

    };
});
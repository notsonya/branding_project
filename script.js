let lines = [];
        let showDisruptionVisuals = false;
        let uiVisible = true;

        // UI Toggle functionality for mobile
        function setupUIToggle() {
            const toggleButton = document.getElementById('toggle-ui-button');
            const controls = document.getElementById('controls');
            
            if (!toggleButton) return;
            
            toggleButton.addEventListener('click', () => {
                uiVisible = !uiVisible;
                if (uiVisible) {
                    controls.style.display = 'flex';
                    toggleButton.textContent = '∅';
                } else {
                    controls.style.display = 'none';
                    toggleButton.textContent = '❋';
                }
            });
        } 
        let params = {
            flowAngle: Math.PI / 4,
            turbulence: 0.015,
            lineCount: 100, 
            lineThickness: 1,
            animateFlowAngle: false,
            animateTurbulence: false,
            animateLineCount: false,
            svgOutlineThreshold: 10 
        };

        let animateTurbulenceField = false;
        let drawingMode = false; 
        let circles = [];
        let drawingPoints = [];
        let uploadedSvgDrawingPaths = []; 
        let showSvgOverlay = true;

        const CIRCLE_RADIUS = 50;
        const DRAWING_POINT_SPACING_SQ = 15 * 15;

        const colorPalettes = {
    // Regular palettes - dark lines on light backgrounds
            Yellow: [
                '#FFC500', '#FFC500', '#FFC500', '#FFC500', '#FFC500',
                '#FFC500', '#FFC500', '#FFC500', '#FFC500', '#FFC500', '#FFC500'
            ],
            Red: [
                '#B7624A', '#B7624A', '#B7624A', '#B7624A', '#B7624A',
                '#B7624A', '#B7624A', '#B7624A', '#B7624A', '#B7624A', '#B7624A'
            ],
            Green: [
                '#93B09C', '#93B09C', '#93B09C', '#93B09C', '#93B09C',
                '#93B09C', '#93B09C', '#93B09C', '#93B09C', '#93B09C', '#93B09C'
            ],
            Grey: [
                '#9F9F9F', '#9F9F9F', '#9F9F9F', '#9F9F9F', '#9F9F9F',
                '#9F9F9F', '#9F9F9F', '#9F9F9F', '#9F9F9F', '#9F9F9F', '#9F9F9F'
            ],
            
            // Light palettes - light lines on dark backgrounds (reversed)
            LightYellow: [
                '#FFF7DC', '#FFF7DC', '#FFF7DC', '#FFF7DC', '#FFF7DC',
                '#FFF7DC', '#FFF7DC', '#FFF7DC', '#FFF7DC', '#FFF7DC', '#FFF7DC'
            ],
            LightRed: [
                '#FEF1EE', '#FEF1EE', '#FEF1EE', '#FEF1EE', '#FEF1EE',
                '#FEF1EE', '#FEF1EE', '#FEF1EE', '#FEF1EE', '#FEF1EE', '#FEF1EE'
            ],
            LightGreen: [
                '#EDF9EE', '#EDF9EE', '#EDF9EE', '#EDF9EE', '#EDF9EE',
                '#EDF9EE', '#EDF9EE', '#EDF9EE', '#EDF9EE', '#EDF9EE', '#EDF9EE'
            ],
            LightGrey: [
                '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8',
                '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8'
            ]
        };
        const backgroundPalettes = {
            // Regular palettes use light backgrounds
            Yellow: ['#FFF7DC'],
            Red: ['#FEF1EE'],
            Green: ['#EDF9EE'],
            Grey: ['#F8F8F8'],
            
            // Light palettes use dark backgrounds (reversed)
            LightYellow: ['#FFC500'],
            LightRed: ['#B7624A'],
            LightGreen: ['#93B09C'],
            LightGrey: ['#9F9F9F']
        };
        const paletteBackgroundMapping = {
            // Regular palettes map to their light backgrounds
            Yellow: 'LightYellow',
            Red: 'LightRed',
            Green: 'LightGreen',
            Grey: 'LightGrey',
            
            // Light palettes map to their dark backgrounds (reversed)
            LightYellow: 'Yellow',
            LightRed: 'Red',
            LightGreen: 'Green', 
            LightGrey: 'Grey'
        };

        let currentPalette = colorPalettes.Yellow;
        let currentBackgroundPalette = backgroundPalettes.Yellow;

        const BASE_LINE_COUNT = 100;

        function setup() {
            createCanvas(windowWidth, windowHeight);
            stroke(255);
            noFill();

            setupUIToggle();
            setupControls();

            document.getElementById('export-svg').onclick = exportSVG;

            const uploadSvgInput = document.getElementById('upload-svg-input');
            const uploadSvgButton = document.getElementById('upload-svg-button');

            uploadSvgButton.addEventListener('click', () => uploadSvgInput.click());
            uploadSvgInput.addEventListener('change', uploadSVG);
            
            document.getElementById('preloadedSvgSelect').addEventListener('change', function (e) {
                const filePath = e.target.value;
                if (!filePath) return;

                fetch(filePath)
                    .then(response => response.text())
                    .then(svgString => {
                        const parser = new DOMParser();
                        const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
                        const uploadedSvgElement = svgDoc.documentElement;

                        if (uploadedSvgElement.tagName.toLowerCase() !== 'svg') {
                            alert('Invalid SVG file.');
                            return;
                        }

                        // Same logic as uploadSVG()
                        const svgOverlay = document.getElementById('svg-overlay');
                        svgOverlay.innerHTML = '';
                        svgOverlay.appendChild(uploadedSvgElement);

                        drawingPoints = [];
                        circles = [];

                        positionUploadedSVG(uploadedSvgElement);

                        const hideSvgOverlayCheckbox = document.getElementById('hideSvgOverlay');
                        hideSvgOverlayCheckbox.checked = true;
                        showSvgOverlay = true;
                        svgOverlay.style.display = 'block';

                        extractAndTransformSvgPaths(uploadedSvgElement);
                    })
                    .catch(err => {
                        console.error('Error loading SVG:', err);
                        alert('Failed to load SVG.');
                    });
            });

            //canvas.addEventListener('mousedown', handleCanvasMouseDown);
            //canvas.addEventListener('mouseup', handleCanvasMouseUp);
            //canvas.addEventListener('mousemove', handleCanvasMouseMove);
        }

        function windowResized() {
            resizeCanvas(windowWidth, windowHeight);
            const svgOverlay = document.getElementById('svg-overlay');
            if (svgOverlay.firstElementChild) {
                positionUploadedSVG(svgOverlay.firstElementChild);
                extractAndTransformSvgPaths(svgOverlay.firstElementChild);
            }
        }

        function draw() {
            let t = millis() / 1000;
            if (params.animateFlowAngle) {
                params.flowAngle = Math.PI / 2 + Math.sin(t) * Math.PI / 2;
            }
            if (params.animateTurbulence) {
                params.turbulence = 0.01 + 0.01 * Math.sin(t * 0.7);
            }
            if (params.animateLineCount) {
                params.lineCount = Math.round(20 + 20 * Math.abs(Math.sin(t * 0.3)));
                if (params.lineCount < 10) params.lineCount = 10;
            }

            lines = [];
            let n = params.lineCount;
            let prevPoints = null;
            for (let i = 0; i < n; i++) {
                let y = map(i, 0, n - 1, 0, height);
                let idx = Math.floor(map(i, 0, n - 1, 0, currentPalette.length - 1));
                let color = currentPalette[idx];
                let lineObj = new FlowLine(y, prevPoints, color);
                lines.push(lineObj);
                prevPoints = lineObj.points;
            }

            background(currentBackgroundPalette[0]);
            for (let l of lines) {
                l.update();
                l.display();
            }
            
            drawDisruptionVisuals();
        }

        class FlowLine {
            constructor(y, prevPoints, color) {
                this.points = [];
                this.color = color;
                let t = animateTurbulenceField ? millis() / 2000 : 0;
                let effectiveTurbulence = params.turbulence * (BASE_LINE_COUNT / params.lineCount);

                    for (let x = 0; x < width; x += 5) {
                    // Simple linear fade from left to right (like HTML version)
                    let turbulenceAmount = 1.3 - (x / width); // 1 (left) to 0 (right)

                    let n = noise(x * effectiveTurbulence, y * effectiveTurbulence, t);
                    let disruptFactor = 1;

                    // Disruption from circles
                    for (const c of circles) {
                        let dx = x - c.x;
                        let dy = y - c.y;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < c.r) {
                            disruptFactor = 2;
                            break;
                        }
                    }

                    // Disruption from drawing points
                    if (disruptFactor === 1 && drawingPoints.length > 1) {
                        for (let i = 0; i < drawingPoints.length - 1; i++) {
                            const p1 = drawingPoints[i];
                            const p2 = drawingPoints[i + 1];
                            const distToSegment = distPointToLineSegment({ x: x, y: y }, p1, p2);
                            if (distToSegment < CIRCLE_RADIUS / 2) {
                                disruptFactor = 2;
                                break;
                            }
                        }
                    }

                    if (disruptFactor === 1 && uploadedSvgDrawingPaths.length > 0) {
                        const disruptionRadius = CIRCLE_RADIUS / 2;
                        
                        for (const pathPoints of uploadedSvgDrawingPaths) {
                            if (pathPoints && pathPoints.length > 1) {
                                for (let i = 0; i < pathPoints.length - 1; i++) {
                                    const p1 = pathPoints[i];
                                    const p2 = pathPoints[i + 1];
                                    
                                    // Skip if points are too far apart (likely gap in path)
                                    const segmentLength = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
                                    if (segmentLength > 50) continue; // Skip large gaps
                                    
                                    const distToSegment = distPointToLineSegment({ x: x, y: y }, p1, p2);
                                    if (distToSegment < disruptionRadius) {
                                        disruptFactor = 2;
                                        break;
                                    }
                                }
                                if (disruptFactor === 2) break;
                            }
                        }
                    }

                    let angle = params.flowAngle + n * TWO_PI * turbulenceAmount * disruptFactor;
                    let offsetY = sin(angle) * 20 * turbulenceAmount * disruptFactor;
                    let baseY = y + offsetY;

                    if (prevPoints && this.points.length < prevPoints.length) {
                        baseY = baseY * 0.5 + prevPoints[this.points.length].y * 0.5;
                    }
                    this.points.push({ x: x, y: baseY });
                }
            }

            update() { }

            display() {
                stroke(this.color);
                strokeWeight(params.lineThickness);
                strokeCap(ROUND);
                strokeJoin(ROUND);
                beginShape();
                for (let p of this.points) {
                    vertex(p.x, p.y);
                }
                endShape();
            }
        }

        function setupControls() {
            const flowAngle = document.getElementById('flowAngle');
            const turbulence = document.getElementById('turbulence');
            const lineCount = document.getElementById('lineCount');
            const lineThickness = document.getElementById('lineThickness');
            const flowAngleValue = document.getElementById('flowAngleValue');
            const turbulenceValue = document.getElementById('turbulenceValue');
            const lineCountValue = document.getElementById('lineCountValue');
            const lineThicknessValue = document.getElementById('lineThicknessValue');
            const svgOutlineThreshold = document.getElementById('svgOutlineThreshold');
            svgOutlineThreshold.closest('div').style.display = 'none';
            const svgOutlineThresholdValue = document.getElementById('svgOutlineThresholdValue'); // New span

            //const animateFlowAngle = document.getElementById('animateFlowAngle');
            //const animateTurbulence = document.getElementById('animateTurbulence');
            //const animateLineCount = document.getElementById('animateLineCount');

            const paletteSelect = document.getElementById('paletteSelect');

            const clearDrawingBtn = document.getElementById('clearDrawing');
            
            const toggleVisualBtn = document.createElement('button');
            toggleVisualBtn.textContent = 'Show Outlines';
            toggleVisualBtn.type = 'button';
            toggleVisualBtn.addEventListener('click', () => {
                showDisruptionVisuals = !showDisruptionVisuals;
                toggleVisualBtn.textContent = showDisruptionVisuals ? 'Hide Outlines' : 'Show Outlines';
            });
            const canvasElement = document.querySelector('canvas');

            flowAngle.value = params.flowAngle;
            turbulence.value = params.turbulence;
            lineCount.value = params.lineCount;
            lineThickness.value = params.lineThickness;
            svgOutlineThreshold.value = params.svgOutlineThreshold; // Set initial value

            flowAngleValue.textContent = Number(params.flowAngle).toFixed(2);
            turbulenceValue.textContent = Number(params.turbulence).toFixed(3);
            lineCountValue.textContent = params.lineCount;
            lineThicknessValue.textContent = params.lineThickness;
            svgOutlineThresholdValue.textContent = params.svgOutlineThreshold; // Display initial value

            // animateFlowAngle.checked = params.animateFlowAngle;
            //animateTurbulence.checked = params.animateTurbulence;
            //animateLineCount.checked = params.animateLineCount;

            flowAngle.addEventListener('input', e => {
                const newFlowAngle = parseFloat(e.target.value);
                params.flowAngle = newFlowAngle;
                flowAngleValue.textContent = newFlowAngle.toFixed(2);

                // Sync turbulence linearly
                const newTurbulence = (newFlowAngle / 6.283) * (0.05 - 0.015) + 0.015;
                params.turbulence = newTurbulence;
                turbulence.value = newTurbulence;
                turbulenceValue.textContent = newTurbulence.toFixed(3);
            });

            turbulence.addEventListener('input', e => {
                const newTurbulence = parseFloat(e.target.value);
                params.turbulence = newTurbulence;
                turbulenceValue.textContent = newTurbulence.toFixed(3);

                // Sync flow angle linearly
                const newFlowAngle = ((newTurbulence - 0.015) / (0.05 - 0.015)) * 6.283;
                params.flowAngle = newFlowAngle;
                flowAngle.value = newFlowAngle;
                flowAngleValue.textContent = newFlowAngle.toFixed(2);
            });
            lineCount.addEventListener('input', e => { params.lineCount = parseInt(e.target.value); lineCountValue.textContent = params.lineCount; });
            lineThickness.addEventListener('input', e => { params.lineThickness = parseFloat(e.target.value); lineThicknessValue.textContent = params.lineThickness; });
            svgOutlineThreshold.addEventListener('input', e => { params.svgOutlineThreshold = parseFloat(e.target.value); svgOutlineThresholdValue.textContent = params.svgOutlineThreshold; }); // Listener for new control

            //animateFlowAngle.addEventListener('change', e => { params.animateFlowAngle = e.target.checked; });
            //animateTurbulence.addEventListener('change', e => { params.animateTurbulence = e.target.checked; });
            //animateLineCount.addEventListener('change', e => { params.animateLineCount = e.target.checked; });

            //const controlsForm = document.getElementById('controls');
            //const turbulenceFieldDiv = document.createElement('div');
            //turbulenceFieldDiv.innerHTML = `<label><input type="checkbox" id="animateTurbulenceField"> Animate Turbulence Field</label>`;
            //const exportButton = document.getElementById('export-svg');
            //controlsForm.insertBefore(turbulenceFieldDiv, exportButton);
            //document.getElementById('animateTurbulenceField').addEventListener('change', e => {
            //    animateTurbulenceField = e.target.checked;
            //});

            paletteSelect.addEventListener('change', e => {
                const selectedPaletteName = e.target.value;
                currentPalette = colorPalettes[selectedPaletteName];
                
                // Use backgroundPalettes instead of colorPalettes for backgrounds
                currentBackgroundPalette = backgroundPalettes[selectedPaletteName] || ['#FDFDFD'];
                
                console.log(`Selected palette: ${selectedPaletteName}`);
                console.log('Line color:', currentPalette[0]);
                console.log('Background color:', currentBackgroundPalette[0]);
            });

            clearDrawingBtn.addEventListener('click', () => {
                drawingPoints = [];
                circles = [];
                uploadedSvgDrawingPaths = [];
                document.getElementById('svg-overlay').innerHTML = '';
            });
            const hideSvgOverlayCheckbox = document.getElementById('hideSvgOverlay');
            hideSvgOverlayCheckbox.addEventListener('change', (e) => {
                showSvgOverlay = e.target.checked;
                const svgOverlay = document.getElementById('svg-overlay');
                svgOverlay.style.display = showSvgOverlay ? 'block' : 'none';
            });

        }

        let isDragging = false;
        let lastDrawingPoint = { x: -Infinity, y: -Infinity };

        function handleCanvasMouseDown(e) {
            if (e.button !== 0) return;

            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            isDragging = true;

            if (drawingMode) {
                drawingPoints.push({ x: mx, y: my });
                lastDrawingPoint = { x: mx, y: my };
            } else {
                let removed = false;
                for (let i = 0; i < circles.length; i++) {
                    const c = circles[i];
                    const dx = mx - c.x;
                    const dy = my - c.y;
                    if (Math.sqrt(dx * dx + dy * dy) < c.r) {
                        circles.splice(i, 1);
                        removed = true;
                        break;
                    }
                }
                if (!removed) {
                    circles.push({ x: mx, y: my, r: CIRCLE_RADIUS });
                }
            }
        }

        function handleCanvasMouseMove(e) {
            if (!isDragging) return;

            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            if (drawingMode) {
                const distSq = (mx - lastDrawingPoint.x) * (mx - lastDrawingPoint.x) + (my - lastDrawingPoint.y) * (my - lastDrawingPoint.y);
                if (distSq > DRAWING_POINT_SPACING_SQ) {
                    drawingPoints.push({ x: mx, y: my });
                    lastDrawingPoint = { x: mx, y: my };
                }
            }
        }

        function handleCanvasMouseUp(e) {
            isDragging = false;
        }

       function distPointToLineSegment(point, lineStart, lineEnd) {
            const A = point.x - lineStart.x;
            const B = point.y - lineStart.y;
            const C = lineEnd.x - lineStart.x;
            const D = lineEnd.y - lineStart.y; // Fixed: was lineEnd.y - lineEnd.y

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;

            if (lenSq === 0) {
                return Math.sqrt(A * A + B * B);
            }

            let param = dot / lenSq;
            param = Math.max(0, Math.min(1, param));

            const projX = lineStart.x + param * C;
            const projY = lineStart.y + param * D;

            const dx = point.x - projX;
            const dy = point.y - projY;

            return Math.sqrt(dx * dx + dy * dy);
        }

        function exportSVG() {
            // Store current size
            const originalWidth = width;
            const originalHeight = height;

            // Store original pixel density
            const originalDensity = pixelDensity();
            
            // Set pixel density to 1 for precise sizing
            pixelDensity(1); 

            // Resize to export dimensions
            resizeCanvas(1920, 1080);
            
            // Force a complete redraw at new size
            draw();
            
            // Save the canvas
            saveCanvas('reflective_lines', 'jpg');
            
            // Restore original size
            resizeCanvas(originalWidth, originalHeight);
            
            // Restore original pixel density
            pixelDensity(originalDensity);

            // Force redraw at original size
            draw();
        }
        


        function drawDisruptionVisuals() {
            if (!showDisruptionVisuals) return; // Only draw if enabled
            
            // Rest of your existing drawDisruptionVisuals code...
            for (const c of circles) {
                stroke(255, 100, 100, 150);
                noFill();
                ellipse(c.x, c.y, c.r * 2, c.r * 2);
            }

            if (drawingPoints.length > 1) {
                stroke(100, 255, 100, 150);
                noFill();
                beginShape();
                for (const p of drawingPoints) {
                    vertex(p.x, p.y);
                }
                endShape();
            }

            if (uploadedSvgDrawingPaths.length > 0) {
                stroke(100, 100, 255, 150); // Blue outline for svg
                noFill();
                const minSegmentLengthSq = params.svgOutlineThreshold * params.svgOutlineThreshold;

                for (const pathPoints of uploadedSvgDrawingPaths) {
                    if (pathPoints.length > 1) {
                        beginShape();
                        vertex(pathPoints[0].x, pathPoints[0].y); 

                        for (let i = 1; i < pathPoints.length; i++) {
                            const p1 = pathPoints[i - 1];
                            const p2 = pathPoints[i];
                            const distSq = (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);

                            if (distSq > minSegmentLengthSq) {
                                endShape();
                                beginShape();
                                vertex(p2.x, p2.y);
                            } else {
                                vertex(p2.x, p2.y);
                            }
                        }
                        endShape();
                    }
                }
            }
            strokeWeight(1); // Reset strokeWeight
        }

        function uploadSVG(event) {
            const file = event.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const svgString = e.target.result;
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
                const uploadedSvgElement = svgDoc.documentElement;

                if (uploadedSvgElement.tagName.toLowerCase() !== 'svg') {
                    alert('Please upload a valid SVG file.');
                    return;
                }

                const svgOverlay = document.getElementById('svg-overlay');
                svgOverlay.innerHTML = '';
                svgOverlay.appendChild(uploadedSvgElement);

                drawingPoints = [];
                circles = [];

                positionUploadedSVG(uploadedSvgElement);

                const hideSvgOverlayCheckbox = document.getElementById('hideSvgOverlay');
                hideSvgOverlayCheckbox.checked = true;
                showSvgOverlay = true;
                svgOverlay.style.display = 'block';

                extractAndTransformSvgPaths(uploadedSvgElement);
            };
            reader.readAsText(file);
        }

        function positionUploadedSVG(svgElement) {
            const canvasWidth = width;
            const canvasHeight = height;

            let svgViewBoxWidth, svgViewBoxHeight, svgViewBoxX = 0, svgViewBoxY = 0;
            const viewBox = svgElement.viewBox.baseVal;

            if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
                svgViewBoxWidth = viewBox.width;
                svgViewBoxHeight = viewBox.height;
                svgViewBoxX = viewBox.x;
                svgViewBoxY = viewBox.y;
            } else {
                // Try to get bounding box, with fallback
                try {
                    const bbox = svgElement.getBBox();
                    svgViewBoxX = bbox.x;
                    svgViewBoxY = bbox.y;
                    svgViewBoxWidth = bbox.width;
                    svgViewBoxHeight = bbox.height;
                    
                    if (svgViewBoxWidth > 0 && svgViewBoxHeight > 0) {
                        svgElement.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
                    } else {
                        throw new Error("Invalid bounding box");
                    }
                } catch (e) {
                    console.warn("Could not determine SVG dimensions, using defaults:", e);
                    svgViewBoxWidth = 300;
                    svgViewBoxHeight = 150;
                    svgViewBoxX = 0;
                    svgViewBoxY = 0;
                    svgElement.setAttribute('viewBox', `0 0 ${svgViewBoxWidth} ${svgViewBoxHeight}`);
                }
            }

            const scaleFactor = 0.6; // Slightly smaller for better visibility
            const targetWidth = canvasWidth * scaleFactor;
            const targetHeight = canvasHeight * scaleFactor;

            const scaleX = targetWidth / svgViewBoxWidth;
            const scaleY = targetHeight / svgViewBoxHeight;
            const scale = Math.min(scaleX, scaleY);

            const finalWidth = svgViewBoxWidth * scale;
            const finalHeight = svgViewBoxHeight * scale;

            svgElement.style.width = `${finalWidth}px`;
            svgElement.style.height = `${finalHeight}px`;
            svgElement.style.position = 'absolute';
            svgElement.style.left = '50%';
            svgElement.style.top = '50%';
            svgElement.style.transform = 'translate(-50%, -50%)';

            console.log('SVG positioned:', {
                originalSize: { width: svgViewBoxWidth, height: svgViewBoxHeight },
                scaledSize: { width: finalWidth, height: finalHeight },
                scale: scale
            });
            svgElement.style.display = showSvgOverlay ? 'block' : 'none';
        }


        function extractAndTransformSvgPaths(svgElement) {
    uploadedSvgDrawingPaths = [];

    // Wait for next frame to ensure DOM is updated
    requestAnimationFrame(() => {
        const viewBox = svgElement.viewBox.baseVal;
        const svgMinX = viewBox.x || 0;
        const svgMinY = viewBox.y || 0;
        const svgIntrinsicWidth = viewBox.width || 300;
        const svgIntrinsicHeight = viewBox.height || 150;

        const svgRect = svgElement.getBoundingClientRect();
        const canvasElement = document.querySelector('canvas');
        const canvasRect = canvasElement.getBoundingClientRect();

        // Calculate scale factors
        const scaleX = svgRect.width / svgIntrinsicWidth;
        const scaleY = svgRect.height / svgIntrinsicHeight;

        // Calculate offset from canvas origin
        const offsetX = svgRect.left - canvasRect.left;
        const offsetY = svgRect.top - canvasRect.top;

        console.log('SVG Transform Info:', {
            svgRect,
            canvasRect,
            viewBox: { x: svgMinX, y: svgMinY, width: svgIntrinsicWidth, height: svgIntrinsicHeight },
            scale: { x: scaleX, y: scaleY },
            offset: { x: offsetX, y: offsetY }
        });

        // Extract paths with improved sampling
        const paths = svgElement.querySelectorAll('path, polyline, line, circle, rect, ellipse');
        
        paths.forEach((path, pathIndex) => {
            let currentPathPoints = [];

            try {
                if (path.tagName.toLowerCase() === 'path') {
                    const pathLength = path.getTotalLength();
                    // Increase sampling density for better accuracy
                    const segmentLength = 2; // Sample every 2 pixels
                    const numSegments = Math.max(10, Math.ceil(pathLength / segmentLength));

                    for (let i = 0; i <= numSegments; i++) {
                        const t = i / numSegments;
                        const p = path.getPointAtLength(t * pathLength);
                        
                        const transformedX = offsetX + (p.x - svgMinX) * scaleX;
                        const transformedY = offsetY + (p.y - svgMinY) * scaleY;
                        
                        currentPathPoints.push({ x: transformedX, y: transformedY });
                    }
                } else if (path.tagName.toLowerCase() === 'polyline') {
                    const rawPoints = path.points;
                    for (let i = 0; i < rawPoints.numberOfItems; i++) {
                        const p = rawPoints.getItem(i);
                        const transformedX = offsetX + (p.x - svgMinX) * scaleX;
                        const transformedY = offsetY + (p.y - svgMinY) * scaleY;
                        currentPathPoints.push({ x: transformedX, y: transformedY });
                    }
                } else if (path.tagName.toLowerCase() === 'line') {
                    const x1 = parseFloat(path.getAttribute('x1') || 0);
                    const y1 = parseFloat(path.getAttribute('y1') || 0);
                    const x2 = parseFloat(path.getAttribute('x2') || 0);
                    const y2 = parseFloat(path.getAttribute('y2') || 0);

                    currentPathPoints.push({
                        x: offsetX + (x1 - svgMinX) * scaleX,
                        y: offsetY + (y1 - svgMinY) * scaleY
                    });
                    currentPathPoints.push({
                        x: offsetX + (x2 - svgMinX) * scaleX,
                        y: offsetY + (y2 - svgMinY) * scaleY
                    });
                } else if (path.tagName.toLowerCase() === 'circle') {
                    const cx = parseFloat(path.getAttribute('cx') || 0);
                    const cy = parseFloat(path.getAttribute('cy') || 0);
                    const r = parseFloat(path.getAttribute('r') || 0);

                    // Sample circle as points
                    const numPoints = Math.max(16, Math.ceil(2 * Math.PI * r / 5));
                    for (let i = 0; i < numPoints; i++) {
                        const angle = (i / numPoints) * 2 * Math.PI;
                        const x = cx + r * Math.cos(angle);
                        const y = cy + r * Math.sin(angle);
                        
                        currentPathPoints.push({
                            x: offsetX + (x - svgMinX) * scaleX,
                            y: offsetY + (y - svgMinY) * scaleY
                        });
                    }
                } else if (path.tagName.toLowerCase() === 'rect') {
                    const x = parseFloat(path.getAttribute('x') || 0);
                    const y = parseFloat(path.getAttribute('y') || 0);
                    const width = parseFloat(path.getAttribute('width') || 0);
                    const height = parseFloat(path.getAttribute('height') || 0);

                    // Create rectangle as path points
                    const rectPoints = [
                        { x: x, y: y },
                        { x: x + width, y: y },
                        { x: x + width, y: y + height },
                        { x: x, y: y + height },
                        { x: x, y: y } // Close the rectangle
                    ];

                    rectPoints.forEach(p => {
                        currentPathPoints.push({
                            x: offsetX + (p.x - svgMinX) * scaleX,
                            y: offsetY + (p.y - svgMinY) * scaleY
                        });
                    });
                }

                if (currentPathPoints.length > 0) {
                    uploadedSvgDrawingPaths.push(currentPathPoints);
                    console.log(`Path ${pathIndex} extracted with ${currentPathPoints.length} points`);
                }
            } catch (e) {
                console.warn(`Error processing path ${pathIndex}:`, e);
            }
        });

        console.log("Total SVG drawing paths extracted:", uploadedSvgDrawingPaths.length);
        console.log("Sample points from first path:", uploadedSvgDrawingPaths[0]?.slice(0, 5));
    });
    
}
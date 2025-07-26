// /Users/jordan/Desktop/DiplopiaGuide/DiplopiaWebsite/js/manualMaddoxGrid.js
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let rodEye = MaddoxRodEye.RIGHT;
    let measurements = [];
    let editingGazePosition = null;
    let showAnalysis = false;
    let diagnosticSuggestions = [];

    // --- DOM ELEMENTS ---
    const rodEyePicker = document.getElementById('rodEyePicker');
    const cardinalGridElement = document.getElementById('cardinalGrid');
    const headTiltGridElement = document.getElementById('headTiltGrid');
    const analyzeMeasurementsButton = document.getElementById('analyzeMeasurementsButton');
    const analysisResultsSection = document.getElementById('analysisResultsSection');
    const diagnosticSuggestionsContainer = document.getElementById('diagnosticSuggestionsContainer');
    const resetGridButton = document.getElementById('resetGridButton');

    // Modal Elements
    const modal = document.getElementById('measurementInputModal');
    const modalHeader = document.getElementById('modalHeader');
    const modalCloseButton = modal.querySelector('.close-button');
    const modalHorizontalValue = document.getElementById('modalHorizontalValue');
    const modalHorizontalDirection = document.getElementById('modalHorizontalDirection');
    const modalVerticalValue = document.getElementById('modalVerticalValue');
    const modalVerticalDirection = document.getElementById('modalVerticalDirection');
    const modalTorsionRow = document.getElementById('modalTorsionRow');
    const modalTorsionValue = document.getElementById('modalTorsionValue');
    const modalTorsionDescription = document.getElementById('modalTorsionDescription');
    const modalDoneButton = document.getElementById('modalDoneButton');

    const cardinalGazesGridStructure = [
        [null, GazePosition.UP, null],
        [GazePosition.RIGHT, GazePosition.PRIMARY, GazePosition.LEFT],
        [null, GazePosition.DOWN, null]
    ];
    const headTiltGazesList = [GazePosition.TILT_RIGHT, GazePosition.TILT_LEFT];

    // --- INITIALIZATION ---
    function initializeApp() {
        initializeMeasurements();
        renderGrid();
        setupEventListeners();
        updateUI();
    }

    function initializeMeasurements() {
        measurements = [];
        const cardinalGazesForInit = [GazePosition.PRIMARY, GazePosition.UP, GazePosition.DOWN, GazePosition.LEFT, GazePosition.RIGHT];
        
        cardinalGazesForInit.forEach(gaze => {
            measurements.push(new MaddoxMeasurement(undefined, gaze, DeviationType.HORIZONTAL, "0"));
            measurements.push(new MaddoxMeasurement(undefined, gaze, DeviationType.VERTICAL, "0"));
            if (gaze === GazePosition.PRIMARY) {
                measurements.push(new MaddoxMeasurement(undefined, gaze, DeviationType.TILT, "0"));
            }
        });

        headTiltGazesList.forEach(gaze => {
            // For head tilts, we primarily care about vertical.
            // Add dummy H for sheet binding consistency if needed, or handle in modal.
            // For now, just vertical.
            measurements.push(new MaddoxMeasurement(undefined, gaze, DeviationType.VERTICAL, "0"));
        });
        console.log("Initialized measurements:", measurements);
    }

    // --- RENDERING ---
    function renderGrid() {
        renderCardinalGrid();
        renderHeadTiltGrid();
    }

    function getMeasurementDisplay(gaze, type) {
        const measurement = measurements.find(m => m.gazePosition === gaze && m.deviationType === type);
        if (!measurement) return type === DeviationType.TILT ? "No Torsion" : `Ortho ${type.charAt(0).toUpperCase()}`;

        if (measurement.numericValue === 0) {
            return type === DeviationType.TILT ? "No Torsion" : `Ortho ${type.charAt(0).toUpperCase()}`;
        }

        const absVal = Math.abs(measurement.numericValue);
        const valStr = absVal % 1 === 0 ? String(absVal) : absVal.toFixed(1);

        if (type === DeviationType.HORIZONTAL) {
            const signedVal = measurement.signedValue(DeviationType.HORIZONTAL, rodEye);
            return `${valStr}Δ ${signedVal > 0 ? "ET" : "XT"}`;
        } else if (type === DeviationType.VERTICAL) {
            const signedVal = measurement.signedValue(DeviationType.VERTICAL, rodEye);
            return `${valStr}Δ ${signedVal > 0 ? "RHT" : "LHT"}`;
        } else if (type === DeviationType.TILT) {
            const signedVal = measurement.signedValue(DeviationType.TILT, rodEye); // rodEye doesn't affect tilt sign here
            return `${valStr}° ${signedVal > 0 ? "Excyclo" : "Incyclo"}`;
        }
        return "N/A";
    }

    function renderCardinalGrid() {
        cardinalGridElement.innerHTML = '';
        cardinalGazesGridStructure.forEach(row => {
            row.forEach(gaze => {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                if (gaze) {
                    cell.dataset.gaze = gaze;
                    const hDisplay = getMeasurementDisplay(gaze, DeviationType.HORIZONTAL);
                    const vDisplay = getMeasurementDisplay(gaze, DeviationType.VERTICAL);
                    
                    cell.innerHTML = `
                        <span class="measurement-h ${hDisplay.startsWith('Ortho') ? 'ortho' : ''}">${hDisplay}</span>
                        <span class="measurement-v ${vDisplay.startsWith('Ortho') ? 'ortho' : ''}">${vDisplay}</span>
                    `;

                    if (gaze === GazePosition.PRIMARY) {
                        const tDisplay = getMeasurementDisplay(gaze, DeviationType.TILT);
                        cell.innerHTML += `<span class="measurement-t ${tDisplay.startsWith('No Torsion') ? 'ortho' : ''}">${tDisplay}</span>`;
                    }
                    cell.innerHTML += `<span class="gaze-label">${gaze.replace(' Gaze', '')}</span>`;
                    cell.addEventListener('click', () => openModal(gaze));
                } else {
                    cell.classList.add('not-tested');
                    cell.innerHTML = `<span class="gaze-label">N/T</span>`;
                }
                cardinalGridElement.appendChild(cell);
            });
        });
    }

    function renderHeadTiltGrid() {
        headTiltGridElement.innerHTML = '';
        headTiltGazesList.forEach(gaze => {
            const cell = document.createElement('div');
            cell.classList.add('tilt-cell');
            cell.dataset.gaze = gaze;

            const vDisplay = getMeasurementDisplay(gaze, DeviationType.VERTICAL);
            // Use Unicode arrows: ↶ (counter-clockwise for TILT_RIGHT) and ↷ (clockwise for TILT_LEFT)
            const icon = gaze === GazePosition.TILT_RIGHT ? '↶' : '↷';


            cell.innerHTML = `
                <div class="tilt-icon">${icon}</div>
                <div class="tilt-title">${gaze.replace('Tilt ', 'Head Tilt ')}</div>
                <div class="measurement-v ${vDisplay.startsWith('Ortho') ? 'ortho' : ''}">${vDisplay}</div>
            `;
            cell.addEventListener('click', () => openModal(gaze));
            headTiltGridElement.appendChild(cell);
        });
    }
    
    function updateUI() {
        analysisResultsSection.style.display = showAnalysis ? 'block' : 'none';
        if (showAnalysis) {
            renderDiagnosticSuggestions();
        }
    }

    function renderDiagnosticSuggestions() {
        diagnosticSuggestionsContainer.innerHTML = '';
        if (diagnosticSuggestions.length === 0) {
            const p = document.createElement('p');
            p.textContent = measurements.every(m => m.numericValue === 0) ?
                            "All measurements are ortho. No specific patterns to suggest." :
                            "Measurements show some deviation, but no specific common patterns were identified.";
            p.style.fontStyle = 'italic';
            diagnosticSuggestionsContainer.appendChild(p);
        } else {
            diagnosticSuggestions.forEach(sugg => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerHTML = `
                    <h5>${sugg.name}</h5>
                    <p><strong>Principle:</strong> ${sugg.principleDescription}</p>
                    ${sugg.observedFindings.length > 0 ? `<p><strong>Observed:</strong> ${sugg.observedFindings.join(', ')}</p>` : ''}
                    <p><strong>Formal Clues:</strong> ${sugg.formalCriteriaSummary}</p>
                `;
                diagnosticSuggestionsContainer.appendChild(div);
            });
        }
        const disclaimer = document.createElement('p');
        disclaimer.className = 'disclaimer-text';
        disclaimer.innerHTML = "<strong>Disclaimer:</strong> The suggestions provided are based on common patterns and are for informational purposes only... interpret by a qualified healthcare professional.";
        diagnosticSuggestionsContainer.appendChild(disclaimer);
    }


    // --- EVENT LISTENERS & HANDLERS ---
    function setupEventListeners() {
        rodEyePicker.addEventListener('change', (e) => {
            rodEye = e.target.value === "Right" ? MaddoxRodEye.RIGHT : MaddoxRodEye.LEFT;
            renderGrid(); // Re-render grid as signed values might change display
        });

        analyzeMeasurementsButton.addEventListener('click', handleAnalyze);
        resetGridButton.addEventListener('click', resetGrid);

        // Modal listeners
        modalCloseButton.addEventListener('click', closeModal);
        modalDoneButton.addEventListener('click', saveModalData);
        window.addEventListener('click', (event) => { // Close modal if clicked outside
            if (event.target === modal) {
                closeModal();
            }
        });
        modalTorsionValue.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) || 0;
            modalTorsionDescription.textContent = val === 0 ? "No Torsion" : (val > 0 ? "Excyclotorsion" : "Incyclotorsion");
        });
    }

    function handleAnalyze() {
        // No password for web version
        diagnosticSuggestions = analyzeMaddoxPatterns(measurements, rodEye); // From maddoxAnalyzer.js
        showAnalysis = true;
        updateUI();
        if (analysisResultsSection) analysisResultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    function resetGrid() {
        rodEye = MaddoxRodEye.RIGHT;
        rodEyePicker.value = "Right";
        initializeMeasurements();
        showAnalysis = false;
        diagnosticSuggestions = [];
        renderGrid();
        updateUI();
    }

    // --- MODAL LOGIC ---
    function openModal(gaze) {
        editingGazePosition = gaze;
        modalHeader.textContent = `Edit Measurement: ${gaze.replace(' Gaze', '')}`;

        const hMeas = measurements.find(m => m.gazePosition === gaze && m.deviationType === DeviationType.HORIZONTAL);
        const vMeas = measurements.find(m => m.gazePosition === gaze && m.deviationType === DeviationType.VERTICAL);
        const tMeas = (gaze === GazePosition.PRIMARY) ? measurements.find(m => m.gazePosition === gaze && m.deviationType === DeviationType.TILT) : null;

        // Horizontal
        if (hMeas) {
            modalHorizontalValue.value = Math.abs(hMeas.numericValue);
            const signedH = hMeas.signedValue(DeviationType.HORIZONTAL, rodEye);
            if (hMeas.numericValue === 0) modalHorizontalDirection.value = "Ortho";
            else modalHorizontalDirection.value = signedH > 0 ? "ET" : "XT";
            modalHorizontalValue.parentElement.style.display = 'flex';
        } else {
             modalHorizontalValue.parentElement.style.display = 'none'; // Hide if not applicable (e.g. head tilts)
        }


        // Vertical
        if (vMeas) {
            modalVerticalValue.value = Math.abs(vMeas.numericValue);
            const signedV = vMeas.signedValue(DeviationType.VERTICAL, rodEye);
            if (vMeas.numericValue === 0) modalVerticalDirection.value = "Ortho";
            else modalVerticalDirection.value = signedV > 0 ? "RHT" : "LHT";
            modalVerticalValue.parentElement.style.display = 'flex';
        } else {
            modalVerticalValue.parentElement.style.display = 'none';
        }


        // Torsion (only for primary)
        if (gaze === GazePosition.PRIMARY && tMeas) {
            modalTorsionRow.style.display = 'flex';
            modalTorsionValue.value = tMeas.numericValue; // Already signed
            const tVal = tMeas.numericValue;
            modalTorsionDescription.textContent = tVal === 0 ? "No Torsion" : (tVal > 0 ? "Excyclotorsion" : "Incyclotorsion");
        } else {
            modalTorsionRow.style.display = 'none';
        }
        
        // Disable H/V direction if value is 0
        modalHorizontalDirection.disabled = modalHorizontalValue.value === "0";
        modalVerticalDirection.disabled = modalVerticalValue.value === "0";

        modalHorizontalValue.oninput = () => { modalHorizontalDirection.disabled = modalHorizontalValue.value === "0" || modalHorizontalValue.value === ""; };
        modalVerticalValue.oninput = () => { modalVerticalDirection.disabled = modalVerticalValue.value === "0" || modalVerticalValue.value === ""; };


        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
        editingGazePosition = null;
    }

    function saveModalData() {
        if (!editingGazePosition) return;

        // Horizontal
        const hVal = parseFloat(modalHorizontalValue.value) || 0;
        let hDir = PrismDirection.NONE;
        if (hVal !== 0) {
            if (modalHorizontalDirection.value === "ET") hDir = PrismDirection.BASE_OUT_OVER_NON_ROD_EYE;
            else if (modalHorizontalDirection.value === "XT") hDir = PrismDirection.BASE_IN_OVER_NON_ROD_EYE;
        }
        updateMeasurement(editingGazePosition, DeviationType.HORIZONTAL, String(hVal), hDir);

        // Vertical
        const vVal = parseFloat(modalVerticalValue.value) || 0;
        let vDir = PrismDirection.NONE;
        if (vVal !== 0) {
            if (modalVerticalDirection.value === "RHT") { // RHT
                vDir = (rodEye === MaddoxRodEye.RIGHT) ? PrismDirection.BASE_UP_OVER_NON_ROD_EYE : PrismDirection.BASE_DOWN_OVER_NON_ROD_EYE;
            } else if (modalVerticalDirection.value === "LHT") { // LHT
                vDir = (rodEye === MaddoxRodEye.RIGHT) ? PrismDirection.BASE_DOWN_OVER_NON_ROD_EYE : PrismDirection.BASE_UP_OVER_NON_ROD_EYE;
            }
        }
        updateMeasurement(editingGazePosition, DeviationType.VERTICAL, String(vVal), vDir);

        // Torsion (only if primary)
        if (editingGazePosition === GazePosition.PRIMARY) {
            const tVal = parseFloat(modalTorsionValue.value) || 0;
            updateMeasurement(editingGazePosition, DeviationType.TILT, String(tVal), PrismDirection.NONE);
        }

        renderGrid();
        closeModal();
    }
    
    function updateMeasurement(gaze, type, valueStr, direction) {
        let measurement = measurements.find(m => m.gazePosition === gaze && m.deviationType === type);
        const numericValue = parseFloat(valueStr) || 0;

        if (measurement) {
            measurement.value = String(numericValue); // Store the magnitude
            if (type === DeviationType.TILT) {
                measurement.direction = PrismDirection.NONE; // Tilt uses signed value, not direction enum
            } else {
                measurement.direction = (numericValue === 0) ? PrismDirection.NONE : direction;
            }
        } else {
            // This case should ideally not be hit if initialized correctly, but as a fallback:
            if (type === DeviationType.HORIZONTAL || type === DeviationType.VERTICAL || (type === DeviationType.TILT && gaze === GazePosition.PRIMARY)) {
                 measurements.push(new MaddoxMeasurement(undefined, gaze, type, String(numericValue), direction));
            }
        }
    }

    // --- STARTUP ---
    initializeApp();
});

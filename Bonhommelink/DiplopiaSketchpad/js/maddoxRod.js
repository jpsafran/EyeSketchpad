// js/maddoxRod.js
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE VARIABLES ---
    let currentStep = MaddoxRodGuidedStep.SETUP;
    let eyeWithRod = MaddoxRodEye.RIGHT;
    let currentGazeIndex = 0;
    let currentDeviationType = DeviationType.HORIZONTAL;
    let measurements = []; // Array of MaddoxMeasurement objects
    let tempQualitativeObservation = DotLineRelationship.ALIGNED;
    let tempTiltDirectionChoice = null; // Not directly used in same way, but concept for state
    let diagnosticSuggestions = [];
    let rightRodRotation = 90.0; // degrees, 90 is vertical
    let leftRodRotation = 90.0;  // degrees, 90 is vertical
    let showDiagnosticSuggestions = false;

    const horizontalGazes = [GazePosition.PRIMARY, GazePosition.RIGHT, GazePosition.LEFT, GazePosition.UP, GazePosition.DOWN];
    const verticalGazes = [GazePosition.PRIMARY, GazePosition.RIGHT, GazePosition.LEFT, GazePosition.UP, GazePosition.DOWN, GazePosition.TILT_RIGHT, GazePosition.TILT_LEFT];
    const tiltGazes = [GazePosition.PRIMARY];

    // --- DOM ELEMENTS ---
    const setupSection = document.getElementById('setupSection');
    const testingSection = document.getElementById('testingSection');
    const resultsSection = document.getElementById('resultsSection');
    // ... (get all other relevant DOM elements)
    const eyeWithRodPicker = document.getElementById('eyeWithRodPicker');
    const startTestingButton = document.getElementById('startTestingButton');
    const testingHeader = document.getElementById('testingHeader');
    const currentInstructionsText = document.getElementById('currentInstructionsText');
    const graphicContainer = document.getElementById('maddoxGraphicContainer');
    const graphicLine = document.getElementById('graphicLine');
    const graphicDot = document.getElementById('graphicDot');
    const fellowEyeLine = document.getElementById('fellowEyeLine');
    const rodEyeLine = document.getElementById('rodEyeLine');
    // ... more DOM elements for graphic labels, input sections, buttons etc.
    const qualitativeInputSection = document.getElementById('qualitativeInputSection');
    const quantitativeInputSection = document.getElementById('quantitativeInputSection');
    const quantitativeValueInput = document.getElementById('quantitativeValueInput');
    const quantitativeDirectionDisplay = document.getElementById('quantitativeDirectionDisplay');
    // Double Maddox Interactive UI Elements
    const doubleMaddoxInteractiveUI = document.getElementById('doubleMaddoxInteractiveUI');
    const rightTrialLensElement = document.getElementById('rightTrialLens');
    const leftTrialLensElement = document.getElementById('leftTrialLens');
    const rightLensLine = document.getElementById('rightLensLine');
    const leftLensLine = document.getElementById('leftLensLine');
    const rightLensAngleDisplay = document.getElementById('rightLensAngle');
    const leftLensAngleDisplay = document.getElementById('leftLensAngle');
    const torsionResultDisplay = document.getElementById('torsionResultDisplay');
    const resetTiltButton = document.getElementById('resetTiltButton');


    const backButton = document.getElementById('backButton');
    const confirmNextButton = document.getElementById('confirmNextButton');
    const resetTestButton = document.getElementById('resetTestButton');
    const analyzeButton = document.getElementById('analyzeButton');
    const diagnosticSuggestionsContainer = document.getElementById('diagnosticSuggestionsContainer');
    const backToLastStepButton = document.getElementById('backToLastStepButton');
    const resultsGridContainer = document.getElementById('resultsGridContainer');


    // --- INITIALIZATION ---
    function initializeApp() {
        updateUI();
        setupEventListeners();
    }

    function initializeMeasurements() {
        measurements = [];
        const allGazes = new Set([...horizontalGazes, ...verticalGazes, ...tiltGazes]);
        const orderedGazes = GazePositionCases.filter(gaze => allGazes.has(gaze));

        orderedGazes.forEach(gaze => {
            if (horizontalGazes.includes(gaze)) {
                if (!measurements.some(m => m.gazePosition === gaze && m.deviationType === DeviationType.HORIZONTAL)) {
                    measurements.push(new MaddoxMeasurement(undefined, gaze, DeviationType.HORIZONTAL));
                }
            }
            if (verticalGazes.includes(gaze)) {
                if (!measurements.some(m => m.gazePosition === gaze && m.deviationType === DeviationType.VERTICAL)) {
                    measurements.push(new MaddoxMeasurement(undefined, gaze, DeviationType.VERTICAL));
                }
            }
            if (tiltGazes.includes(gaze)) {
                 if (!measurements.some(m => m.gazePosition === gaze && m.deviationType === DeviationType.TILT)) {
                    measurements.push(new MaddoxMeasurement(undefined, gaze, DeviationType.TILT));
                }
            }
        });
        console.log("Initialized measurements:", measurements.length);
    }

    // --- UI UPDATE FUNCTION ---
    function updateUI() {
        // Show/hide sections based on currentStep
        setupSection.style.display = currentStep === MaddoxRodGuidedStep.SETUP ? 'block' : 'none';
        testingSection.style.display = (currentStep !== MaddoxRodGuidedStep.SETUP && currentStep !== MaddoxRodGuidedStep.RESULTS) ? 'block' : 'none';
        resultsSection.style.display = currentStep === MaddoxRodGuidedStep.RESULTS ? 'block' : 'none';
        resetTestButton.style.display = currentStep !== MaddoxRodGuidedStep.SETUP ? 'inline-block' : 'none';


        if (currentStep !== MaddoxRodGuidedStep.SETUP && currentStep !== MaddoxRodGuidedStep.RESULTS) {
            const gazePos = getCurrentGazePosition();
            testingHeader.textContent = `Testing: ${currentDeviationType.charAt(0).toUpperCase() + currentDeviationType.slice(1)} - ${gazePos}`;
            currentInstructionsText.innerHTML = getCurrentInstructionsHTML(); // Use innerHTML for markdown-like bolding
            
            renderMaddoxRodGraphic();
            populateQualitativeInputs();

            quantitativeInputSection.style.display = 
                (currentStep === MaddoxRodGuidedStep.ENTER_HORIZONTAL_QUANTITATIVE ||
                 currentStep === MaddoxRodGuidedStep.ENTER_VERTICAL_QUANTITATIVE ||
                 currentStep === MaddoxRodGuidedStep.ENTER_TILT_QUANTITATIVE) ? 'block' : 'none';
            
            doubleMaddoxInteractiveUI.style.display = currentStep === MaddoxRodGuidedStep.ENTER_TILT_QUANTITATIVE ? 'block' : 'none';

            if (currentStep === MaddoxRodGuidedStep.ENTER_HORIZONTAL_QUANTITATIVE || currentStep === MaddoxRodGuidedStep.ENTER_VERTICAL_QUANTITATIVE) {
                const currentMeasurement = getCurrentMeasurement();
                quantitativeValueInput.value = currentMeasurement ? currentMeasurement.value : "";
                
                // Display simplified Base In/Out/Up/Down
                const determinedDir = determinedPrismDirection(); // This function calculates based on tempQualitativeObservation
                let simplifiedDirectionText = "Ortho / None";
                if (determinedDir === PrismDirection.BASE_OUT_OVER_NON_ROD_EYE) simplifiedDirectionText = "Base Out";
                else if (determinedDir === PrismDirection.BASE_IN_OVER_NON_ROD_EYE) simplifiedDirectionText = "Base In";
                else if (determinedDir === PrismDirection.BASE_UP_OVER_NON_ROD_EYE) simplifiedDirectionText = "Base Up";
                else if (determinedDir === PrismDirection.BASE_DOWN_OVER_NON_ROD_EYE) simplifiedDirectionText = "Base Down";
                quantitativeDirectionDisplay.textContent = simplifiedDirectionText;

                document.getElementById('quantitativePrompt').textContent = `Enter Prism Diopters (Δ) needed to align:`;
            } else if (currentStep === MaddoxRodGuidedStep.ENTER_TILT_QUANTITATIVE) {
                document.getElementById('quantitativePrompt').textContent = `Adjust lines to be parallel:`;
                // Initialize or update interactive tilt UI
                updateTrialLensVisuals();
                updateTorsionResultDisplay();
            }
            
            backButton.disabled = isFirstQuestionStep();

        } else if (currentStep === MaddoxRodGuidedStep.RESULTS) {
            renderResultsGrid();
            renderHeadTiltResults();
            diagnosticSuggestionsContainer.style.display = showDiagnosticSuggestions ? 'block' : 'none';
            if (showDiagnosticSuggestions) {
                renderDiagnosticSuggestions();
            }
            analyzeButton.textContent = showDiagnosticSuggestions ? "Hide Pattern-Based Suggestions" : "Analyze Measurements & Show Suggestions";
        }
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        startTestingButton.addEventListener('click', () => {
            eyeWithRod = eyeWithRodPicker.value === "Right" ? MaddoxRodEye.RIGHT : MaddoxRodEye.LEFT;
            initializeMeasurements();
            currentStep = MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE;
            currentDeviationType = DeviationType.HORIZONTAL;
            currentGazeIndex = 0;
            tempQualitativeObservation = DotLineRelationship.ALIGNED;
            updateUI();
        });

        resetTestButton.addEventListener('click', resetTest);
        confirmNextButton.addEventListener('click', handleConfirmAndNext);
        backButton.addEventListener('click', goBack);
        analyzeButton.addEventListener('click', handleAnalyze);
        if (backToLastStepButton) {
            backToLastStepButton.addEventListener('click', goBackFromResults);
        }

        setupTrialLensInteractions(rightTrialLensElement, 'right');
        setupTrialLensInteractions(leftTrialLensElement, 'left');
        resetTiltButton.addEventListener('click', resetInteractiveTilt);
        // Add drag listeners for rightTrialLens and leftTrialLens if implementing drag
    }
    
    function handleConfirmAndNext() {
        if (currentStep === MaddoxRodGuidedStep.ENTER_HORIZONTAL_QUANTITATIVE ||
            currentStep === MaddoxRodGuidedStep.ENTER_VERTICAL_QUANTITATIVE) {
            recordQuantitativeObservation(quantitativeValueInput.value, determinedPrismDirection());
        } else if (currentStep === MaddoxRodGuidedStep.ENTER_TILT_QUANTITATIVE) {
            // Logic to get value from interactive tilt UI
            // For now, let's assume a placeholder input or direct value
            const tiltValue = getEffectiveTorsionFromUI(); // Placeholder for getting value from interactive UI
            recordQuantitativeObservation(String(tiltValue), PrismDirection.NONE, null, true);
        }
        advanceTest();
    }

    function resetInteractiveTilt() {
        rightRodRotation = 90.0;
        leftRodRotation = 90.0;
        updateTrialLensVisuals();
        updateTorsionResultDisplay();
    }

    function updateTrialLensVisuals() {
        if (rightLensLine) rightLensLine.style.transform = `rotate(${rightRodRotation}deg)`;
        if (leftLensLine) leftLensLine.style.transform = `rotate(${leftRodRotation}deg)`;
        if (rightLensAngleDisplay) rightLensAngleDisplay.textContent = `${Math.round(rightRodRotation % 360)}°`;
        if (leftLensAngleDisplay) leftLensAngleDisplay.textContent = `${Math.round(leftRodRotation % 360)}°`;

        // Update Rod Labels
        const rightRodLabel = document.getElementById('rightRodLabel');
        const leftRodLabel = document.getElementById('leftRodLabel');
        if (rightRodLabel) rightRodLabel.textContent = (eyeWithRod === MaddoxRodEye.RIGHT) ? "(Rod)" : "";
        if (leftRodLabel) leftRodLabel.textContent = (eyeWithRod === MaddoxRodEye.LEFT) ? "(Rod)" : "";
    }

    function updateTorsionResultDisplay() {
        const torsion = getEffectiveTorsionFromUI();
        const otherEye = (eyeWithRod === MaddoxRodEye.RIGHT) ? MaddoxRodEye.LEFT : MaddoxRodEye.RIGHT;
        let displayText = "";
        if (Math.abs(torsion) > 0.1) {
            const cycloType = torsion > 0 ? "Excyclotorsion" : "Incyclotorsion";
            displayText = `${Math.abs(torsion).toFixed(1)}° ${eyeWithRod} Eye: ${cycloType} relative to Fellow Eye`;
        } else {
            displayText = "No Significant Torsion";
        }
        if (torsionResultDisplay) torsionResultDisplay.textContent = displayText;
    }

    function getEffectiveTorsionFromUI() {
        const rightRodTiltFromVertical = rightRodRotation - 90.0;
        const leftRodTiltFromVertical = leftRodRotation - 90.0;
        let torsionValue = 0;
        if (eyeWithRod === MaddoxRodEye.RIGHT) {
            torsionValue = rightRodTiltFromVertical - leftRodTiltFromVertical;
        } else { // eyeWithRod === MaddoxRodEye.LEFT
            torsionValue = leftRodTiltFromVertical - rightRodTiltFromVertical;
        }
        // Normalize to -180 to +180 range (optional, but good practice)
        return ((torsionValue % 360) + 540) % 360 - 180; // More robust normalization
    }


    // --- LOGIC FUNCTIONS (getCurrentGazePosition, advanceTest, goBack, etc.) ---
    function getCurrentGazePosition() {
        switch (currentDeviationType) {
            case DeviationType.HORIZONTAL: return horizontalGazes[currentGazeIndex] || GazePosition.PRIMARY;
            case DeviationType.VERTICAL: return verticalGazes[currentGazeIndex] || GazePosition.PRIMARY;
            case DeviationType.TILT: return tiltGazes[currentGazeIndex] || GazePosition.PRIMARY;
            default: return GazePosition.PRIMARY;
        }
    }
    
    function getCurrentRodOrientation() {
        switch (currentStep) {
            case MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE:
            case MaddoxRodGuidedStep.SHOW_HORIZONTAL_GRAPHIC_RESULT:
            case MaddoxRodGuidedStep.ENTER_HORIZONTAL_QUANTITATIVE:
                return RodAxis.HORIZONTAL;
            case MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE:
            case MaddoxRodGuidedStep.SHOW_VERTICAL_GRAPHIC_RESULT:
            case MaddoxRodGuidedStep.ENTER_VERTICAL_QUANTITATIVE:
            case MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE:
            case MaddoxRodGuidedStep.SHOW_TILT_GRAPHIC_RESULT:
            case MaddoxRodGuidedStep.ENTER_TILT_QUANTITATIVE:
                return RodAxis.VERTICAL;
            default:
                return RodAxis.HORIZONTAL;
        }
    }

    function isFirstQuestionStep() {
        return currentDeviationType === DeviationType.HORIZONTAL &&
               currentGazeIndex === 0 &&
               currentStep === MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE;
    }
    
    function getCurrentInstructionsHTML() {
        const rodEyeUpper = eyeWithRod.toUpperCase();
        const gazePos = getCurrentGazePosition();

        switch (currentStep) {
            case MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE:
            case MaddoxRodGuidedStep.SHOW_HORIZONTAL_GRAPHIC_RESULT:
            case MaddoxRodGuidedStep.ENTER_HORIZONTAL_QUANTITATIVE:
                return `
                    <p><strong>Setup:</strong> Orient rod grooves <strong>HORIZONTALLY</strong> over ${rodEyeUpper}.<br>
                    Patient sees <strong>VERTICAL RED LINE</strong>.</p>
                    <p><strong>Ask (${gazePos}):</strong><br>
                    "Where is the <strong>WHITE DOT</strong> relative to the <strong>VERTICAL RED LINE</strong>?"</p>
                `;
            case MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE:
            case MaddoxRodGuidedStep.SHOW_VERTICAL_GRAPHIC_RESULT:
            case MaddoxRodGuidedStep.ENTER_VERTICAL_QUANTITATIVE:
                 return `
                    <p><strong>Setup:</strong> Orient rod grooves <strong>VERTICALLY</strong> over ${rodEyeUpper}.<br>
                    Patient sees <strong>HORIZONTAL RED LINE</strong>.</p>
                    <p><strong>Ask (${gazePos}):</strong><br>
                    "Where is the <strong>WHITE DOT</strong> relative to the <strong>HORIZONTAL RED LINE</strong>?"</p>
                `;
            case MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE:
            case MaddoxRodGuidedStep.SHOW_TILT_GRAPHIC_RESULT:
            case MaddoxRodGuidedStep.ENTER_TILT_QUANTITATIVE:
                return `
                    <p><strong>Double Maddox Rod Test - PRIMARY POSITION ONLY</strong></p>
                    <p><strong>Setup:</strong><br>
                    1. Place Maddox rods with <strong>VERTICAL GROOVES</strong> over <strong>BOTH</strong> eyes.<br>
                    2. Typically, Red rod over the <strong>${eyeWithRod}</strong> eye.<br>
                    3. White/Clear rod over the fellow eye.<br>
                    4. Ensure patient is looking in <strong>PRIMARY POSITION</strong>.</p>
                `;
            default: return "<p>Loading...</p>";
        }
    }

    function populateQualitativeInputs() {
        qualitativeInputSection.innerHTML = ''; // Clear previous
        if (currentStep !== MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE &&
            currentStep !== MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE &&
            currentStep !== MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE) {
            qualitativeInputSection.style.display = 'none';
            return;
        }
        qualitativeInputSection.style.display = 'block';

        let options = [];
        const fellowEye = (eyeWithRod === MaddoxRodEye.RIGHT) ? MaddoxRodEye.LEFT : MaddoxRodEye.RIGHT;

        if (currentStep === MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE) {
            const dotLeftLabel = (eyeWithRod === MaddoxRodEye.RIGHT) ? "Dot is LEFT of Line (ESO)" : "Dot is LEFT of Line (EXO)";
            const dotRightLabel = (eyeWithRod === MaddoxRodEye.RIGHT) ? "Dot is RIGHT of Line (EXO)" : "Dot is RIGHT of Line (ESO)";
            options = [
                { label: dotLeftLabel, value: DotLineRelationship.DOT_LEFT },
                { label: "Dot is ALIGNED with Line", value: DotLineRelationship.ALIGNED },
                { label: dotRightLabel, value: DotLineRelationship.DOT_RIGHT }
            ];
        } else if (currentStep === MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE) {
            const dotAboveLabel = `Dot ABOVE Line (${eyeWithRod} Hyper / ${fellowEye} Hypo)`;
            const dotBelowLabel = `Dot BELOW Line (${fellowEye} Hyper / ${eyeWithRod} Hypo)`;
            options = [
                { label: dotAboveLabel, value: DotLineRelationship.DOT_ABOVE },
                { label: "Dot is ALIGNED with Line", value: DotLineRelationship.ALIGNED },
                { label: dotBelowLabel, value: DotLineRelationship.DOT_BELOW }
            ];
        } else if (currentStep === MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE) {
            options = [
                { label: "Lines are PARALLEL", value: DotLineRelationship.ALIGNED },
                { label: "Lines are TILTED", value: DotLineRelationship.LINES_TILTED }
            ];
        }

        options.forEach(opt => {
            const button = document.createElement('button');
            button.textContent = opt.label;
            button.classList.add('qualitative-option-button');
            button.addEventListener('click', () => {
                tempQualitativeObservation = opt.value;
                tempTiltDirectionChoice = null; // Reset

                if (opt.value === DotLineRelationship.ALIGNED) {
                    recordQuantitativeObservation("0", PrismDirection.NONE);
                    advanceTest();
                } else {
                    if (currentStep === MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE) {
                        currentStep = MaddoxRodGuidedStep.SHOW_HORIZONTAL_GRAPHIC_RESULT;
                    } else if (currentStep === MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE) {
                        currentStep = MaddoxRodGuidedStep.SHOW_VERTICAL_GRAPHIC_RESULT;
                    } else if (currentStep === MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE) {
                        currentStep = MaddoxRodGuidedStep.ENTER_TILT_QUANTITATIVE;
                        // Focus logic would go here if needed
                    }
                    // Auto-transition after showing graphic result
                    if (currentStep === MaddoxRodGuidedStep.SHOW_HORIZONTAL_GRAPHIC_RESULT ||
                        currentStep === MaddoxRodGuidedStep.SHOW_VERTICAL_GRAPHIC_RESULT) {
                        setTimeout(() => {
                            if (currentStep === MaddoxRodGuidedStep.SHOW_HORIZONTAL_GRAPHIC_RESULT) {
                                currentStep = MaddoxRodGuidedStep.ENTER_HORIZONTAL_QUANTITATIVE;
                            } else if (currentStep === MaddoxRodGuidedStep.SHOW_VERTICAL_GRAPHIC_RESULT) {
                                currentStep = MaddoxRodGuidedStep.ENTER_VERTICAL_QUANTITATIVE;
                            }
                            updateUI();
                            // Focus logic
                        }, 700); // 0.7s delay
                    }
                }
                updateUI();
            });
            qualitativeInputSection.appendChild(button);
        });
    }
    
    function determinedPrismDirection() {
        if (currentDeviationType === DeviationType.TILT) return PrismDirection.NONE;
        
        switch (tempQualitativeObservation) {
            case DotLineRelationship.DOT_ABOVE: return PrismDirection.BASE_UP_OVER_NON_ROD_EYE;
            case DotLineRelationship.DOT_BELOW: return PrismDirection.BASE_DOWN_OVER_NON_ROD_EYE;
            case DotLineRelationship.DOT_LEFT:
                return (eyeWithRod === MaddoxRodEye.RIGHT) ? PrismDirection.BASE_OUT_OVER_NON_ROD_EYE : PrismDirection.BASE_IN_OVER_NON_ROD_EYE;
            case DotLineRelationship.DOT_RIGHT:
                return (eyeWithRod === MaddoxRodEye.RIGHT) ? PrismDirection.BASE_IN_OVER_NON_ROD_EYE : PrismDirection.BASE_OUT_OVER_NON_ROD_EYE;
            default: return PrismDirection.NONE;
        }
    }

    function recordQuantitativeObservation(valueStr, direction, tiltDirection = null, isDirectTiltValue = false) {
        const gazePos = getCurrentGazePosition();
        let measurement = measurements.find(m => m.gazePosition === gazePos && m.deviationType === currentDeviationType);
        if (!measurement) {
            console.error("Could not find measurement to record for", gazePos, currentDeviationType);
            return;
        }

        if (currentDeviationType === DeviationType.TILT) {
            measurement.direction = PrismDirection.NONE;
            measurement.qualitativeTiltObservation = null;
            if (isDirectTiltValue) {
                const numericVal = parseFloat(valueStr) || 0.0;
                measurement.value = numericVal.toFixed(1);
            } else {
                measurement.value = (parseFloat(valueStr.replace(/[^-0-9.]/g, '')) || 0).toFixed(1);
            }
        } else { // Horizontal or Vertical
            const cleanedMagnitude = valueStr.replace(/[^0-9.]/g, '');
            measurement.qualitativeTiltObservation = null;
            measurement.direction = direction;
            measurement.value = (direction === PrismDirection.NONE) ? "0" : cleanedMagnitude;
        }
        console.log("Recorded:", measurement);
    }

    function advanceTest() {
        // Dismiss keyboard (conceptual)
        quantitativeValueInput.blur();

        switch (currentDeviationType) {
            case DeviationType.HORIZONTAL:
                if (currentGazeIndex < horizontalGazes.length - 1) {
                    currentGazeIndex++;
                    currentStep = MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE;
                } else {
                    currentDeviationType = DeviationType.VERTICAL;
                    currentGazeIndex = 0;
                    currentStep = MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE;
                }
                break;
            case DeviationType.VERTICAL:
                if (currentGazeIndex < verticalGazes.length - 1) {
                    currentGazeIndex++;
                    currentStep = MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE;
                } else {
                    currentDeviationType = DeviationType.TILT;
                    currentGazeIndex = 0;
                    currentStep = MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE;
                }
                break;
            case DeviationType.TILT:
                if (currentGazeIndex < tiltGazes.length - 1) {
                    currentGazeIndex++; // Should not happen if tiltGazes is just [.PRIMARY]
                    currentStep = MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE;
                } else {
                    currentStep = MaddoxRodGuidedStep.RESULTS;
                    handleAnalyze(); // Analyze patterns when moving to results
                }
                break;
        }
        tempQualitativeObservation = DotLineRelationship.ALIGNED;
        tempTiltDirectionChoice = null;
        updateUI();
    }

    function goBack() {
        quantitativeValueInput.blur(); // Dismiss keyboard

        const gazePosBeforeBack = getCurrentGazePosition();
        const devTypeBeforeBack = currentDeviationType;

        // If currently in a quantitative entry step, go back to the qualitative question for the SAME measurement
        switch (currentStep) {
            case MaddoxRodGuidedStep.ENTER_HORIZONTAL_QUANTITATIVE:
                currentStep = MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE;
                clearPreviousMeasurementValue(gazePosBeforeBack, devTypeBeforeBack);
                updateUI();
                return; // Exit early
            case MaddoxRodGuidedStep.ENTER_VERTICAL_QUANTITATIVE:
                currentStep = MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE;
                clearPreviousMeasurementValue(gazePosBeforeBack, devTypeBeforeBack);
                updateUI();
                return; // Exit early
            case MaddoxRodGuidedStep.ENTER_TILT_QUANTITATIVE:
                currentStep = MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE;
                clearPreviousMeasurementValue(gazePosBeforeBack, devTypeBeforeBack);
                updateUI();
                return; // Exit early
            default:
                // Not in a quantitative step, proceed with changing gaze/deviation type
                break;
        }

        // Reset temporary observations for the question we are going back to
        tempQualitativeObservation = DotLineRelationship.ALIGNED;
        tempTiltDirectionChoice = null;

        // Logic to change currentDeviationType and currentGazeIndex
        switch (currentDeviationType) {
            case DeviationType.HORIZONTAL:
                if (currentGazeIndex > 0) {
                    currentGazeIndex--;
                    currentStep = MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE;
                } else {
                    // At first H gaze, cannot go back further.
                    // UI will reflect this via isFirstQuestionStep() and backButton.disabled
                    updateUI();
                    return;
                }
                break;
            case DeviationType.VERTICAL:
                if (currentGazeIndex > 0) {
                    currentGazeIndex--;
                    currentStep = MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE;
                } else {
                    // At first V gaze, go back to last H gaze
                    currentDeviationType = DeviationType.HORIZONTAL;
                    currentGazeIndex = horizontalGazes.length - 1;
                    currentStep = MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE;
                }
                break;
            case DeviationType.TILT:
                // At T gaze (always primary), go back to last V gaze
                currentDeviationType = DeviationType.VERTICAL;
                currentGazeIndex = verticalGazes.length > 0 ? verticalGazes.length - 1 : 0;
                currentStep = MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE;
                break;
            default:
                console.error("Unknown deviation type in goBack:", currentDeviationType);
                updateUI();
                return;
        }

        // Clear the value of the measurement we are going back TO.
        // getCurrentGazePosition() and currentDeviationType now reflect the new (previous) state.
        clearPreviousMeasurementValue(getCurrentGazePosition(), currentDeviationType);
        updateUI();
    }
    
    // Modified to accept specific gaze and type to clear
    function clearPreviousMeasurementValue(gazePos, devType) {
        let measurement = measurements.find(m => m.gazePosition === gazePos && m.deviationType === devType);
        if (measurement) {
            measurement.value = "";
            measurement.direction = PrismDirection.NONE;
            measurement.qualitativeTiltObservation = null;
            console.log("Cleared measurement for", gazePos, devType);
        } else {
            console.warn("Could not find measurement to clear for", gazePos, devType);
        }
    }

    function resetTest() {
        currentStep = MaddoxRodGuidedStep.SETUP;
        currentGazeIndex = 0;
        currentDeviationType = DeviationType.HORIZONTAL;
        initializeMeasurements();
        diagnosticSuggestions = [];
        showDiagnosticSuggestions = false;
        updateUI();
    }

    function goBackFromResults() {
        if (currentStep !== MaddoxRodGuidedStep.RESULTS) return; // Should only work from results

        // Go to the last quantitative input step, which is for Tilt.
        currentDeviationType = DeviationType.TILT;
        currentGazeIndex = tiltGazes.length - 1; // Should be 0 if tiltGazes = [PRIMARY]
        currentStep = MaddoxRodGuidedStep.ENTER_TILT_QUANTITATIVE;

        showDiagnosticSuggestions = false; // Hide suggestions
        resetInteractiveTilt(); // Reset lenses to 90 degrees when coming back
        updateUI(); // Update UI to show the testing section
    }

    function setupTrialLensInteractions(lensElement, lensType) {
        if (!lensElement) return;

        let isDragging = false;
        let startAngleOffset = 0;

        const getAngle = (event) => {
            const rect = lensElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;
            return Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
        };

        const onStart = (event) => {
            event.preventDefault();
            isDragging = true;
            lensElement.style.cursor = 'grabbing';
            const currentRotation = lensType === 'right' ? rightRodRotation : leftRodRotation;
            startAngleOffset = currentRotation - getAngle(event);

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        };

        const onMove = (event) => {
            if (!isDragging) return;
            event.preventDefault();
            let newRotation = getAngle(event) + startAngleOffset;
            // Normalize newRotation if desired, e.g., to 0-359 or keep it continuous
            // newRotation = (newRotation % 360 + 360) % 360; // Example normalization

            if (lensType === 'right') {
                rightRodRotation = newRotation;
            } else {
                leftRodRotation = newRotation;
            }
            updateTrialLensVisuals();
            updateTorsionResultDisplay();
        };

        const onEnd = () => {
            isDragging = false;
            lensElement.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        lensElement.addEventListener('mousedown', onStart);
        lensElement.addEventListener('touchstart', onStart, { passive: false });
    }
    function handleAnalyze() {
        // No password check for web version
        diagnosticSuggestions = analyzeMaddoxPatterns(measurements, eyeWithRod); // from maddoxAnalyzer.js
        showDiagnosticSuggestions = !showDiagnosticSuggestions; // Toggle
        updateUI();
        if (showDiagnosticSuggestions && diagnosticSuggestionsContainer) {
            diagnosticSuggestionsContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    function renderMaddoxRodGraphic() {
        const rodOrientation = getCurrentRodOrientation();
        const isAsking = currentStep === MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE ||
                         currentStep === MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE ||
                         currentStep === MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE;

        // Hide all graphic elements initially
        graphicLine.style.display = 'none';
        graphicDot.style.display = 'none';
        fellowEyeLine.style.display = 'none';
        rodEyeLine.style.display = 'none';
        document.getElementById('graphicLineLabel').style.display = 'none';
        document.getElementById('fellowEyeLineLabel').style.display = 'none';
        document.getElementById('rodEyeLineLabel').style.display = 'none';


        if (currentStep === MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE || currentStep === MaddoxRodGuidedStep.SHOW_TILT_GRAPHIC_RESULT) {
            fellowEyeLine.style.display = 'block';
            rodEyeLine.style.display = 'block';
            document.getElementById('fellowEyeLineLabel').style.display = 'block';
            document.getElementById('rodEyeLineLabel').style.display = 'block';
            document.getElementById('rodEyeLineLabel').textContent = `(${eyeWithRod} Eye)`;


            let lineTiltAngle = 0;
            if (tempQualitativeObservation === DotLineRelationship.LINES_TILTED && 
                (currentStep === MaddoxRodGuidedStep.ASK_TILT_QUALITATIVE || currentStep === MaddoxRodGuidedStep.SHOW_TILT_GRAPHIC_RESULT)) {
                lineTiltAngle = (eyeWithRod === MaddoxRodEye.RIGHT ? 10.0 : -10.0);
            }
            // Combine translation for centering with rotation.
            // The translate(-50%, -50%) ensures the element's center aligns with its CSS top/left.
            // CSS left is 50%, top is 35% or 65% via ID.
            rodEyeLine.style.transform = `translate(-50%, -50%) rotate(${lineTiltAngle}deg)`;
            fellowEyeLine.style.transform = `translate(-50%, -50%) rotate(0deg)`; // Always horizontal

        } else if (currentStep === MaddoxRodGuidedStep.ENTER_TILT_QUANTITATIVE) {
            // No graphic, handled by interactive UI
        } else if (
            currentStep === MaddoxRodGuidedStep.ASK_HORIZONTAL_QUALITATIVE ||
            currentStep === MaddoxRodGuidedStep.SHOW_HORIZONTAL_GRAPHIC_RESULT ||
            currentStep === MaddoxRodGuidedStep.ENTER_HORIZONTAL_QUANTITATIVE ||
            currentStep === MaddoxRodGuidedStep.ASK_VERTICAL_QUALITATIVE ||
            currentStep === MaddoxRodGuidedStep.SHOW_VERTICAL_GRAPHIC_RESULT ||
            currentStep === MaddoxRodGuidedStep.ENTER_VERTICAL_QUANTITATIVE
        ) {
            graphicLine.style.display = 'block';
            document.getElementById('graphicLineLabel').style.display = 'block';
            const lineIsVertical = (rodOrientation === RodAxis.HORIZONTAL);

            graphicLine.className = lineIsVertical ? 'graphic-line-vertical' : 'graphic-line-horizontal';
            
            const showCenteredReferenceDot = isAsking;
            const showOffsetResultDot = !isAsking && tempQualitativeObservation !== DotLineRelationship.ALIGNED &&
                                        (tempQualitativeObservation === DotLineRelationship.DOT_LEFT ||
                                         tempQualitativeObservation === DotLineRelationship.DOT_RIGHT ||
                                         tempQualitativeObservation === DotLineRelationship.DOT_ABOVE ||
                                         tempQualitativeObservation === DotLineRelationship.DOT_BELOW);

            if (showCenteredReferenceDot) {
                graphicDot.style.display = 'block';
                graphicDot.className = 'graphic-dot-centered';
                graphicDot.textContent = isAsking ? '?' : '';
                graphicDot.style.transform = 'translate(-50%, -50%)'; // Centering
            } else if (showOffsetResultDot) {
                graphicDot.style.display = 'block';
                graphicDot.className = 'graphic-dot-offset'; // Add styling for this
                graphicDot.textContent = '';
                
                let offsetX = 0, offsetY = 0;
                if (lineIsVertical) { // Vertical line
                    if (tempQualitativeObservation === DotLineRelationship.DOT_LEFT) offsetX = 50; // Patient's L, Physician's R
                    if (tempQualitativeObservation === DotLineRelationship.DOT_RIGHT) offsetX = -50;
                } else { // Horizontal line
                    if (tempQualitativeObservation === DotLineRelationship.DOT_ABOVE) offsetY = -45;
                    if (tempQualitativeObservation === DotLineRelationship.DOT_BELOW) offsetY = 45;
                }
                graphicDot.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
            } else {
                graphicDot.style.display = 'none';
            }
        } else {
            // No graphic for setup or results steps in this container
        }
    }
    
    function renderResultsGrid() {
        resultsGridContainer.innerHTML = ''; // Clear previous

        const gridLayout = [
            [null, GazePosition.UP, null],
            [GazePosition.RIGHT, GazePosition.PRIMARY, GazePosition.LEFT],
            [null, GazePosition.DOWN, null]
        ];

        gridLayout.forEach(rowGazes => {
            rowGazes.forEach(gaze => {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';

                if (gaze === null) {
                    cell.textContent = 'N/T';
                    cell.classList.add('not-tested');
                } else {
                    const hMeas = measurements.find(m => m.gazePosition === gaze && m.deviationType === DeviationType.HORIZONTAL);
                    const vMeas = measurements.find(m => m.gazePosition === gaze && m.deviationType === DeviationType.VERTICAL);
                    const tMeas = (gaze === GazePosition.PRIMARY) ? measurements.find(m => m.gazePosition === gaze && m.deviationType === DeviationType.TILT) : null;

                    // Horizontal Measurement
                    const hSpan = document.createElement('span');
                    hSpan.className = 'measurement-h';
                    if (hMeas && hMeas.numericValue !== 0) {
                        const signedH = hMeas.signedValue(DeviationType.HORIZONTAL, eyeWithRod);
                        hSpan.textContent = `${Math.abs(hMeas.numericValue)}Δ ${signedH > 0 ? "ET" : "XT"}`;
                    } else {
                        hSpan.textContent = "Ortho H";
                        hSpan.classList.add('ortho');
                    }
                    cell.appendChild(hSpan);

                    // Vertical Measurement
                    const vSpan = document.createElement('span');
                    vSpan.className = 'measurement-v';
                    if (vMeas && vMeas.numericValue !== 0) {
                        const signedV = vMeas.signedValue(DeviationType.VERTICAL, eyeWithRod);
                        vSpan.textContent = `${Math.abs(vMeas.numericValue)}Δ ${signedV > 0 ? "RHT" : "LHT"}`;
                    } else {
                        vSpan.textContent = "Ortho V";
                        vSpan.classList.add('ortho');
                    }
                    cell.appendChild(vSpan);

                    // Torsion Measurement (only for primary)
                    if (gaze === GazePosition.PRIMARY) {
                        const tSpan = document.createElement('span');
                        tSpan.className = 'measurement-t';
                        if (tMeas && tMeas.numericValue !== 0) {
                            const signedT = tMeas.signedValue(DeviationType.TILT, eyeWithRod);
                            tSpan.textContent = `${Math.abs(tMeas.numericValue)}° ${signedT > 0 ? "Excyclo" : "Incyclo"}`;
                        } else {
                            tSpan.textContent = "No Torsion";
                            tSpan.classList.add('ortho');
                        }
                        cell.appendChild(tSpan);
                    }

                    // Gaze Label
                    const gazeLabelSpan = document.createElement('span');
                    gazeLabelSpan.className = 'gaze-label';
                    gazeLabelSpan.textContent = gaze.replace(' Gaze', ''); // Shorten label like "Primary"
                    cell.appendChild(gazeLabelSpan);
                }
                resultsGridContainer.appendChild(cell);
            });
        });
    }
    
    function renderHeadTiltResults() {
        // This function remains to display head tilt results separately if needed,
        // or could be integrated elsewhere if the design changes.
        // For now, keeping its structure but ensuring it doesn't conflict with the grid.
        const container = document.getElementById('headTiltResultsContainer');
        container.innerHTML = ''; // Clear previous

        [GazePosition.TILT_RIGHT, GazePosition.TILT_LEFT].forEach(gaze => {
            const meas = measurements.find(m => m.gazePosition === gaze && m.deviationType === DeviationType.VERTICAL);
            
            // Create a structure similar to .head-tilt-result-item if you want to keep that CSS
            const itemDiv = document.createElement('div');
            itemDiv.className = 'head-tilt-result-item'; // Assuming this class is styled

            const titleDiv = document.createElement('div');
            titleDiv.className = 'gaze-title'; // Assuming this class is styled
            titleDiv.textContent = gaze === GazePosition.TILT_RIGHT ? "V @ Head Tilt Right" : "V @ Head Tilt Left";
            itemDiv.appendChild(titleDiv);

            const valueDiv = document.createElement('div');
            valueDiv.className = 'measurement-value'; // Assuming this class is styled
            if (meas && meas.numericValue !== 0) {
                valueDiv.textContent = meas.displayValue(eyeWithRod);
            } else {
                valueDiv.textContent = "Ortho V";
                valueDiv.classList.add('ortho');
            }
            itemDiv.appendChild(valueDiv);
            container.appendChild(itemDiv);
        });
    }

    function renderDiagnosticSuggestions() {
        diagnosticSuggestionsContainer.innerHTML = '<h4>Pattern-Based Diagnostic Suggestions</h4>';
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
    
    function getCurrentMeasurement() {
        const gazePos = getCurrentGazePosition();
        return measurements.find(m => m.gazePosition === gazePos && m.deviationType === currentDeviationType);
    }


    // --- STARTUP ---
    initializeApp();
});

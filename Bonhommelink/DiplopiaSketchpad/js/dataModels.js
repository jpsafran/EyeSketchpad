// js/dataModels.js

// --- Enums from MaddoxRodView.swift & others ---

const DeviationType = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
    TILT: 'tilt'
};

const GazePosition = {
    PRIMARY: "Primary",
    RIGHT: "Right Gaze",
    LEFT: "Left Gaze",
    UP: "Up Gaze",
    DOWN: "Down Gaze",
    TILT_RIGHT: "Tilt Right", // Head Tilt Right
    TILT_LEFT: "Tilt Left"    // Head Tilt Left
};
// For iteration or creating select options
const GazePositionCases = Object.values(GazePosition);

const MaddoxRodEye = {
    RIGHT: "Right",
    LEFT: "Left"
};
const MaddoxRodEyeCases = Object.values(MaddoxRodEye);

const RodAxis = {
    HORIZONTAL: "Horizontal Grooves", // Patient sees Vertical Line
    VERTICAL: "Vertical Grooves"    // Patient sees Horizontal Line
};
const RodAxisCases = Object.values(RodAxis);

const MaddoxRodGuidedStep = {
    SETUP: 'setup',
    ASK_HORIZONTAL_QUALITATIVE: 'askHorizontalQualitative',
    SHOW_HORIZONTAL_GRAPHIC_RESULT: 'showHorizontalGraphicResult',
    ENTER_HORIZONTAL_QUANTITATIVE: 'enterHorizontalQuantitative',
    ASK_VERTICAL_QUALITATIVE: 'askVerticalQualitative',
    SHOW_VERTICAL_GRAPHIC_RESULT: 'showVerticalGraphicResult',
    ENTER_VERTICAL_QUANTITATIVE: 'enterVerticalQuantitative',
    ASK_TILT_QUALITATIVE: 'askTiltQualitative',
    SHOW_TILT_GRAPHIC_RESULT: 'showTiltGraphicResult',
    ENTER_TILT_QUANTITATIVE: 'enterTiltQuantitative',
    RESULTS: 'results'
};

const DotLineRelationship = {
    ALIGNED: "Aligned / Parallel",
    DOT_LEFT: "Dot Left of Line",
    DOT_RIGHT: "Dot Right of Line",
    DOT_ABOVE: "Dot Above Line",
    DOT_BELOW: "Dot Below Line",
    LINES_TILTED: "Lines Tilted",
    UNTESTED: "Not Tested"
};
const DotLineRelationshipCases = Object.values(DotLineRelationship);

const PrismDirection = {
    NONE: "Ortho / None",
    BASE_IN_OVER_NON_ROD_EYE: "Base In (BI) over Non-Rod Eye",
    BASE_OUT_OVER_NON_ROD_EYE: "Base Out (BO) over Non-Rod Eye",
    BASE_UP_OVER_NON_ROD_EYE: "Base Up (BU) over Non-Rod Eye",
    BASE_DOWN_OVER_NON_ROD_EYE: "Base Down (BD) over Non-Rod Eye",

    directions: function(type) {
        switch (type) {
            case DeviationType.HORIZONTAL: return [this.NONE, this.BASE_IN_OVER_NON_ROD_EYE, this.BASE_OUT_OVER_NON_ROD_EYE];
            case DeviationType.VERTICAL: return [this.NONE, this.BASE_UP_OVER_NON_ROD_EYE, this.BASE_DOWN_OVER_NON_ROD_EYE];
            case DeviationType.TILT: return [this.NONE];
            default: return [this.NONE];
        }
    },
    deviationDescription: function(direction) {
        switch (direction) {
            case this.NONE: return "Ortho";
            case this.BASE_IN_OVER_NON_ROD_EYE: return "Exo";
            case this.BASE_OUT_OVER_NON_ROD_EYE: return "Eso";
            case this.BASE_UP_OVER_NON_ROD_EYE: return "Rod Hyper / Non-Rod Hypo";
            case this.BASE_DOWN_OVER_NON_ROD_EYE: return "Rod Hypo / Non-Rod Hyper";
            default: return "";
        }
    },
    isVertical: function(direction) {
        return direction === this.BASE_UP_OVER_NON_ROD_EYE || direction === this.BASE_DOWN_OVER_NON_ROD_EYE;
    },
    isHorizontal: function(direction) {
        return direction === this.BASE_IN_OVER_NON_ROD_EYE || direction === this.BASE_OUT_OVER_NON_ROD_EYE;
    }
};
const PrismDirectionCases = Object.values(PrismDirection).filter(val => typeof val === 'string');


// --- MaddoxMeasurement Class ---
class MaddoxMeasurement {
    constructor(id = uuidv4(), gazePosition, deviationType, value = "", direction = PrismDirection.NONE, qualitativeTiltObservation = null) {
        this.id = id;
        this.gazePosition = gazePosition;
        this.deviationType = deviationType;
        this.value = String(value); // Ensure value is a string
        this.direction = (deviationType === DeviationType.TILT) ? PrismDirection.NONE : direction;
        this.qualitativeTiltObservation = (deviationType === DeviationType.TILT) ? qualitativeTiltObservation : null;
    }

    get numericValue() {
        const numStr = this.value.replace(/[^-0-9.]/g, '');
        return parseFloat(numStr) || 0.0;
    }

    displayValue(rodEye = null) {
        if (this.value.trim() === "" || this.numericValue === 0) {
            return "Ortho";
        }
        const formattedValue = Math.abs(this.numericValue).toString(); // Simple absolute value

        switch (this.deviationType) {
            case DeviationType.HORIZONTAL:
                if (this.direction === PrismDirection.NONE) return "Ortho H";
                return `${formattedValue}Δ ${PrismDirection.deviationDescription(this.direction)}`;
            case DeviationType.VERTICAL:
                if (this.direction === PrismDirection.NONE) return "Ortho V";
                return `${formattedValue}Δ ${PrismDirection.deviationDescription(this.direction)}`;
            case DeviationType.TILT:
                const torsionDesc = this.numericValue < 0 ? "Intorsion" : "Extorsion";
                return `${formattedValue}° ${torsionDesc}`;
            default:
                return "N/A";
        }
    }

    signedValue(type, rodEye) {
        const magnitude = Math.abs(this.numericValue); // Ensure magnitude is positive

        switch (type) {
            case DeviationType.HORIZONTAL:
                switch (this.direction) {
                    case PrismDirection.BASE_OUT_OVER_NON_ROD_EYE: return magnitude; // Eso
                    case PrismDirection.BASE_IN_OVER_NON_ROD_EYE: return -magnitude; // Exo
                    default: return 0.0;
                }
            case DeviationType.VERTICAL:
                switch (this.direction) {
                    case PrismDirection.BASE_UP_OVER_NON_ROD_EYE: // Rod Eye Hyper / Fellow Eye Hypo
                        return rodEye === MaddoxRodEye.RIGHT ? magnitude : -magnitude;
                    case PrismDirection.BASE_DOWN_OVER_NON_ROD_EYE: // Fellow Eye Hyper / Rod Eye Hypo
                        return rodEye === MaddoxRodEye.RIGHT ? -magnitude : magnitude;
                    default: return 0.0;
                }
            case DeviationType.TILT:
                return this.numericValue; // Tilt value is already signed
            default: return 0.0;
        }
    }

    // For JSON serialization if needed
    toJSON() {
        return {
            id: this.id,
            gazePosition: this.gazePosition,
            deviationType: this.deviationType,
            value: this.value,
            direction: this.direction,
            qualitativeTiltObservation: this.qualitativeTiltObservation
        };
    }

    static fromJSON(json) {
        return new MaddoxMeasurement(
            json.id,
            json.gazePosition,
            json.deviationType,
            json.value,
            json.direction,
            json.qualitativeTiltObservation
        );
    }
}

// --- PatternDiagnosticSuggestion Class ---
class PatternDiagnosticSuggestion {
    constructor(name, principleDescription, observedFindings, formalCriteriaSummary) {
        this.id = uuidv4();
        this.name = name;
        this.principleDescription = principleDescription;
        this.observedFindings = observedFindings; // Array of strings
        this.formalCriteriaSummary = formalCriteriaSummary;
    }
}


// --- Enums from ParksThreeStepView.swift ---
const MusclePositionType = {
    CORNER: 'corner',
    SIDE: 'side'
};
const HorizontalSide = {
    LEFT: 'left',
    RIGHT: 'right'
};

const EyeMuscle = {
    RSR: "RSR", RIR: "RIR", RSO: "RSO", RIO: "RIO",
    LSR: "LSR", LIR: "LIR", LSO: "LSO", LIO: "LIO",
    RLR: "RLR", RMR: "RMR",
    LLR: "LLR", LMR: "LMR",

    isVerticalMuscle: function(muscle) {
        return ![this.RLR, this.RMR, this.LLR, this.LMR].includes(muscle);
    },
    // ... other properties like nerve, primaryAction, pathologyDescription, clinicalPearl
    // would be translated similarly if needed by the web version's logic.
};
const EyeMuscleCases = Object.values(EyeMuscle).filter(val => typeof val === 'string');


const HypertrophiaSide = {
    RIGHT: "Right Eye Hyper",
    LEFT: "Left Eye Hyper"
};
const HypertrophiaSideCases = Object.values(HypertrophiaSide);

const GazeDirection = { // Note: Different from GazePosition
    RIGHT: "Right Gaze",
    LEFT: "Left Gaze"
};
const GazeDirectionCases = Object.values(GazeDirection);

const TiltDirection = { // Note: Different from GazePosition TILT_LEFT/TILT_RIGHT
    RIGHT: "Right Head Tilt",
    LEFT: "Left Head Tilt"
};
const TiltDirectionCases = Object.values(TiltDirection);


// --- Enums from CoverUncoverTest.swift ---
const CoverTestFixationTarget = {
    DISTANCE: "Distance",
    NEAR: "Near"
};
const CoverTestFixationTargetCases = Object.values(CoverTestFixationTarget);

const EyeTested = { // Same as MaddoxRodEye but distinct for this test's context
    RIGHT: "Right Eye",
    LEFT: "Left Eye"
};
const EyeTestedCases = Object.values(EyeTested);

const CoverTestType = {
    COVER_UNCOVER: "Cover-Uncover Test",
    ALTERNATE_COVER: "Alternate Cover Test"
};
const CoverTestTypeCases = Object.values(CoverTestType);

const MovementDirection = {
    NONE: "No Movement (Ortho)",
    INWARD: "Inward (Exotropia)",
    OUTWARD: "Outward (Esotropia)",
    UPWARD: "Upward (Hypotropia)",
    DOWNWARD: "Downward (Hypertropia)",
    REFIXATE_INWARD: "Refixates Inward (Exophoria)",
    REFIXATE_OUTWARD: "Refixates Outward (Esophoria)",
    REFIXATE_UPWARD: "Refixates Upward (Hypophoria)",
    REFIXATE_DOWNWARD: "Refixates Downward (Hyperphoria)",

    tropiaOptions: function() {
        return [this.NONE, this.INWARD, this.OUTWARD, this.UPWARD, this.DOWNWARD];
    },
    phoriaOptions: function() {
        return [this.NONE, this.REFIXATE_INWARD, this.REFIXATE_OUTWARD, this.REFIXATE_UPWARD, this.REFIXATE_DOWNWARD];
    }
};

const PrismBase = {
    NONE: "None",
    BASE_IN: "Base In (BI)",
    BASE_OUT: "Base Out (BO)",
    BASE_UP: "Base Up (BU)",
    BASE_DOWN: "Base Down (BD)"
};
const PrismBaseCases = Object.values(PrismBase);

class CoverTestMeasurement {
    constructor(id = uuidv4(), fixationTarget, testType, eyeCoveredOrTested = null, movement = MovementDirection.NONE, prismValue = "", prismBase = PrismBase.NONE, eyeForPrism = null) {
        this.id = id;
        this.fixationTarget = fixationTarget;
        this.testType = testType;
        this.eyeCoveredOrTested = eyeCoveredOrTested;
        this.movement = movement;
        this.prismValue = prismValue;
        this.prismBase = prismBase;
        this.eyeForPrism = eyeForPrism;
    }

    get numericPrismValue() {
        const numStr = this.prismValue.replace(/[^0-9.]/g, '');
        return parseFloat(numStr) || 0.0;
    }

    get resultDescription() {
        let desc = `${this.fixationTarget}, ${this.testType}`;
        if (this.eyeCoveredOrTested) { desc += ` (${this.eyeCoveredOrTested} observed/covered)`; }
        desc += `: ${this.movement}`;
        if (this.numericPrismValue > 0) {
            desc += ` neutralized with ${this.prismValue}Δ ${this.prismBase}`;
            if (this.eyeForPrism && (this.prismBase === PrismBase.BASE_UP || this.prismBase === PrismBase.BASE_DOWN)) {
                desc += ` over ${this.eyeForPrism} eye`;
            }
        }
        return desc;
    }
}


// --- Enums from DiplopiaAssessmentFrameworkView.swift ---
const DiplopiaTypeSelection = {
    UNDETERMINED: "Select...",
    MONOCULAR: "Monocular",
    BINOCULAR: "Binocular"
};
const YesNoUnselected = {
    UNSELECTED: "Select...",
    YES: "Yes",
    NO: "No"
};
// ... (Translate other enums like EOMLimitationSelection, ComitanceType, HistoryLocalizationHint, etc.)
// For brevity, I'll skip the full list here, but the pattern is the same.


// --- UUID Generator (Simple version for client-side) ---
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

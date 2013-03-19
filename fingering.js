// fingering.js
// Copyright (c) 2013 James van Donsel
//
// ABC muscial notation converter for Anglo Concertina
// Annotates an ABC format tune with semi-optimal fingerings
// for the Anglo Concertina.

// Be safe!
//"use strict";

var verbose = false;

// Button maps
// Lower cost means button is preferred
// Notes are [push, pull].
var jeffriesMap = {

// Top row, LH
"L1a"  : { notes: ["E,", "F,"],  cost: 10, finger: "l4" },
"L2a"  : { notes: ["A,", "_B,"], cost: 10, finger: "l4" },
"L3a"  : { notes: ["^C", "_E"], cost: 10, finger: "l3" },
"L4a"  : { notes: ["A", "G"],    cost: 10, finger: "l2" },
"L5a"  : { notes: ["^G", "_B"],  cost: 10, finger: "l1" },

// Middle row, LH
"L1"  :  { notes: ["C,", "G,"], cost: 1, finger: "l4" },
"L2"  :  { notes: ["G,", "B,"], cost: 1, finger: "l4" },
"L3"  :  { notes: ["C" , "D"],  cost: 1, finger: "l3" },
"L4"  :  { notes: ["E" , "F"],  cost: 1, finger: "l2" },
"L5"  :  { notes: ["G" , "A"],  cost: 1, finger: "l1" },

// Bottom row, LH
"L6"  :  { notes: ["B," , "A,"], cost: 1, finger: "l4" },
"L7"  :  { notes: ["D"  , "^F"], cost: 2,  finger: "l4" },
"L8"  :  { notes: ["G"  , "A"],  cost: 2,  finger: "l3" },
"L9"  :  { notes: ["B"  , "c"],  cost: 2,  finger: "l2" },
"L10" :  { notes: ["d"  , "e"],  cost: 2,  finger: "l1" },

// Top row, RH
"R1a"  :  { notes: ["^d" , "^c"],  cost: 10, finger: "r1" },
"R2a"  :  { notes: ["^c" , "^d"],    cost: 10, finger: "r2" },
"R3a"  :  { notes: ["^g", "g"],   cost: 10, finger: "r3" },
"R4a"  :  { notes: ["^c'", "_b'"], cost: 10, finger: "r4" },
"R5a"  :  { notes: ["a''", "d'"],  cost: 10, finger: "r4" },

// Middle row, RH
"R1"  :  { notes: ["c"  , "B"],  cost: 1, finger: "r1" },
"R2"  :  { notes: ["e"  , "d"],  cost: 1, finger: "r2" },
"R3"  :  { notes: ["g"  , "f"],  cost: 2, finger: "r3" },
"R4"  :  { notes: ["c'" , "a"],  cost: 2, finger: "r4" },
"R5" :   { notes: ["e'" , "b'"], cost: 1, finger: "r4" },

// Bottom row, RH
"R6"  :  { notes: ["g" , "^f"],  cost: 1, finger: "r1" },
"R7"  :  { notes: ["b"  , "a"],  cost: 1, finger: "r2" },
"R8"  :  { notes: ["d'" , "c'"],  cost: 1, finger: "r3" },
"R9"  :  { notes: ["g'", "e'"],  cost: 1, finger: "r4" },
"R10" :  { notes: ["b'", "^f'"],  cost: 1, finger: "r4" },
};

var buttonToNoteMap = jeffriesMap;

// Globals
var abcOutput = "";
var keySignature = null;
var bestCost;
var alreadyVisited = null;
var startTime = new Date().getTime();

function log(s) {
    if (verbose)
        console.log(s);
}

function finger(abcInput) {

    log("Got input:"+abcInput);

    // Find the key signature in the input
    keySignature = findKeySignature(abcInput);

    if (keySignature == null) {
        return ("ERROR: Unknown or unsupported key signature");
    }


     // Generate an array of note objects. Each
     var notes = getAbcNotes(abcInput);

     // Generate the inverse mapping
     var noteToButtonMap = generateNoteToButtonMap(buttonToNoteMap);

     // Sort the inverse mapping table with the least costly buttons first.
    // This speeds up tree pruning later
    sortButtonMap(noteToButtonMap);

     var buttonChoices = chooseFingerings(notes, noteToButtonMap);
     if (buttonChoices == null) {
         log("No fingerings generated!");
         return abcOutput;
     }

     // Merge the chosen fingerings with the ABC notation
     abcOutput = mergeFingerings(abcInput, buttonChoices.buttons, notes);

     return abcOutput;

 }

 // Note constructor
 var Note = function(index, unNormalizedValue, normalizedValue) {
     this.index = index; // Index of this note in the original ABC input string

     // These values an ABC string like "G" or "^A'"
     // Unnormalized means it's the literal note string from the ABC source.
     this.unNormalizedValue = unNormalizedValue; 

     // Normalized means it's adjusted by the key signature and extra decorations are removed.
     this.normalizedValue = normalizedValue; 
 }

 // Determines the key signature
 // abcInput: ABC input string
 // returns: key signature map to use, or null on error.
function findKeySignature(abcInput) {

    var myMap = null;

    var keyMatch = abcInput.match(/[kK]: *([A-G])([b#])? *(.*?)$/m);
    if (keyMatch == null || keyMatch.length < 3) {
        return null;
    }

    var keySignatureBase;
    var keyExtra;

    if (keyMatch[2] == undefined) {
        keySignatureBase = keyMatch[1];
    }
    else {
        keySignatureBase = keyMatch[1] + keyMatch[2];
    }
    keyExtra = keyMatch[3].toLowerCase();


    log("Got base key of '" + keySignatureBase + "' and extra of '" + keyExtra + "'");

    // Determine musical mode
    if (keyExtra == "" ||
        keyExtra.search("maj") != -1 ||
        keyExtra.search("ion") != -1) {
        log("Mode: Ionian (major)");
        myMap = keySignatureMap(keySignatureBase, 0);
    } else if (keyExtra.search("mix") != -1) {
        log("Mode: Mixolydian");
        myMap = keySignatureMap(keySignatureBase, 1);
    } else if (keyExtra.search("dor") != -1) {
        log("Mode: Dorian");
        myMap = keySignatureMap(keySignatureBase, 2);
    } else if ((keyExtra.search("m") != -1 && keyExtra.search("mix") == -1) ||
               keyExtra.search("min") != -1 ||
               keyExtra.search("aeo") != -1) {
        log("Mode: Aeolian (minor)");
        myMap = keySignatureMap(keySignatureBase, 3);
    } else if (keyExtra.search("phr") != -1) {
        log("Mode: Phrygian");
        myMap = keySignatureMap(keySignatureBase, 4);
    } else if (keyExtra.search("loc") != -1) {
        log("Mode: Locrian");
        myMap = keySignatureMap(keySignatureBase, 5);
    } else if (keyExtra.search("lyd") != -1) {
        log("Mode: Lydian");
        myMap = keySignatureMap(keySignatureBase, -1);
    } else if (keyExtra.search("exp") != -1) {
        log("(Accidentals to be explicitly specified)");
        myMap = keySignatureMap("C", 0);
    } else {
        // Unknown
        log("Failed to determine key signature mode");
        myMap = null;
    }

    if (myMap == null) {
        return myMap;
    }

    //Handle explicit accidentals
    var explicitFlats = keyExtra.match(/_./g);
    var explicitSharps = keyExtra.match(/\^./g);

    for (note in explicitFlats) {
        myMap.flats += explicitFlats[note][1].toUpperCase();
    }

    for (note in explicitSharps) {
        myMap.sharps += explicitSharps[note][1].toUpperCase();
    }

    return myMap;

}

// Calculates a key signature map given a tonic and a mode
function keySignatureMap(tonic, modeFlatness) {
    var circleOfFifths = "FCGDAEB"

    var signature = {
        sharps: "",
        flats: ""
    }

    var baseSharpness = circleOfFifths.indexOf(tonic[0]) - 1;

    if (baseSharpness == -2) {
        log("Bad tonic: " + tonic);
        return null;
    }

    if (tonic.slice(1) == "b") {
        baseSharpness -= 7;
    } else if (tonic.slice(1) == "#") {
        baseSharpness += 7;
    }

    var totalSharpness = baseSharpness - modeFlatness;

    if (totalSharpness > 7) {
        log("Too many sharps: " + totalSharpness);
        return null;
    }
    else if (totalSharpness < -7) {
        log("Too many flats: " + (totalSharpness * -1));
        return null;
    }
    else if (totalSharpness > 0) {
        signature.sharps = circleOfFifths.slice(0, totalSharpness);
    }
    else if (totalSharpness < 0) {
        signature.flats = circleOfFifths.slice(totalSharpness);
    }

    signature.accidentalSharps = "";
    signature.accidentalFlats = "";
    signature.accidentalNaturals = "";

    return signature;
}

// Merges an array of Button objects with an array of Notes
// with the original string input.
// Returns a merged string.
function mergeFingerings(input, buttons, notes) {
    if (buttons.length != notes.length) {
        return "ERROR: Internal error. Length mismatch";
    }

    var result = input;
    var insertedTotal = 0;
    for (var i = 0; i < buttons.length; ++i) {

        var index = notes[i].index + insertedTotal;

        var fingering = buttons[i].button;

        // Add double quotes to fingering
        fingering = "\"" + fingering + "\"";

        var fingLen = fingering.length;
        //log("Merge["+i+"] index="+index+" fingLen="+fingLen+" insertedTotal="+insertedTotal);

        result = result.substr(0, index) + fingering + result.substr(index);

        insertedTotal += fingLen;
    }
    
    return result;
}

// Button Choice constructor.
//
// buttons: list of buttons, each one a string like "L1"
// cost: integer cost of total set of buttons, lower is better
var ButtonChoices = function(buttons, cost) {
     this.buttons = buttons; 
     this.cost = cost; 
 }

// Determines if these two buttons would be a hop if 
// played back-to-back
function isHop(button1, button2) {
    
    // Check for finger hops (i.e. same finger, different button)
    return (button1.finger == button2.finger && 
            button1.button != button2.button) ;
}



// Chooses fingerings.
// returns: a ButtonChoices object with the best button choices
// 
// This is the guts of this program.  Uses various
// heuristics to choose semi-optimal fingerings
// for the given note sequence. 
//
// Recursively chooses the best fingering from
// all possible fingerings.
function chooseFingerings(notes, noteToButtonMap) {
 
    bestCost = 100000000;

    alreadyVisited = {};

   return chooseFingeringsRecursive(notes, 0, noteToButtonMap);
}

function chooseFingeringsRecursive(notes, noteIndex, noteToButtonMap) {

    if (notes.length == noteIndex ) {
        // Done with notes. Bubble back up.
        log("Popping up the stack");
        return  new ButtonChoices([], 0);
    }



    var note = notes[noteIndex]
    var unNormalizedValue = note.unNormalizedValue;
    var normalizedValue = note.normalizedValue;

    log("["+getTime()+"] Choosing: note=" + normalizedValue + "[" + noteIndex + "]");

    if (alreadyVisited[note]) {
        log("Already visited note[" + note.normalizedValue + "," + noteIndex + "]");
        return alreadyVisited[note];
    }


    // Consider all possible buttons for this note
    var buttons = noteToButtonMap[normalizedValue];
    if (buttons == null || buttons.length < 1) {
        log("Failed to find button for note " + normalizedValue);
        log("Attempting respell...");
        var otherName = respell(normalizedValue);
        buttons = noteToButtonMap[otherName];
        if (buttons == null || buttons.length < 1) {
            log("Respelling as " + otherName + " failed to find a button.");
            abcOutput = "ERROR:Failed to find button for note '" + normalizedValue + "'";
            return null;
        }
    }
    
    var bestButtonChoice = {cost:10000000, buttons:[]};

    // Recurse! Find the fingering for the rest of the tune.
    var choice = chooseFingeringsRecursive(notes, noteIndex+1, noteToButtonMap);
    if (choice == null) {
        log("Could not get fingerings");
        return null;
    }


    for (var i = 0; i < buttons.length; ++i) {

        var b = buttons[i];
        
        log("Trying button " + b.button + " ("+ (i+1) + " of " + buttons.length + ") for note " + note.normalizedValue + "[" + noteIndex + "]");

        
        var newCost = b.cost;
        var HOP_COST = 100;

        if (choice.buttons.length != 0) {
            var nextFinger = choice.buttons[0].finger;            
            var nextButton = choice.buttons[0].button;

            // Check for finger hops (i.e. same finger, different button)
            if (isHop(b, choice.buttons[0])) {
                // Penalize finger hops (i.e. same finger, different button)
                log("Penalizing finger hop for note " + note.normalizedValue);
                newCost += HOP_COST;
            }
        }


        log("choice had cost of " + choice.cost + " my cost=" + newCost);
        if (choice.cost + newCost < bestButtonChoice.cost) {
            // Best choice so far.
            // Prepend this button to the list.
            var newButtonList = choice.buttons.slice(0); // clone array
            newButtonList.unshift(b);
            bestButtonChoice = new ButtonChoices(newButtonList, choice.cost + newCost);
            log("New best choice for note["+note.normalizedValue+"], cost="+bestButtonChoice.cost);
        }

    }

    // Memoize
    alreadyVisited[note] = bestButtonChoice;
    log("Saving alreadyVisited["+note.normalizedValue+","+noteIndex+"] with cost " + bestButtonChoice.cost);

    return bestButtonChoice;


}

// Replaces parts of the given string with '*'
// input: string to replace
// start: index to start sanitizing
// len: length to sanitize
// Returns a new string
function sanitizeString(input, start, len) {
    var s = "";
    for (var i = 0; i < len; ++i) {
        s += "*";
    }
    
    return input.substr(0, start) + s + input.substr(start+len);

}

// Returns an array of Notes from the ABC string input
function getAbcNotes(input) {
    
    // Sanitize the input, removing header and footer, but keeping
    // the same offsets for the notes. We'll just replace header
    // and footer sections with '*'.
    var sanitizedInput = input;
    var headerRegex = /^\w:.*$/mg;
    var x;
    while (x = headerRegex.exec(input)) {
        sanitizedInput = sanitizeString(sanitizedInput, x.index, x[0].length);
    }

    // TODO: sanitize embedded quotes, too

    log("sanitized input:"+sanitizedInput);
    
    // Find all the notes
    var regex = /([=^_]?[a-gA-G][',]?)/g;
    var notes = [];
    var m;
    while (m = regex.exec(sanitizedInput)) {
        var unNormalizedValue = m[1];
        var normalizedValue = normalize(unNormalizedValue);
        notes.push(new Note((m.index), unNormalizedValue, normalizedValue));
    }

    return notes;
}

function respell(note) {
    var ret = note;
    // enharmonic respellings
    var respellings = {
        //    "_A": "^G",
        "^A": "_B",
        //    "_B": "^A",
        //    "B": "_C",
        "^B": "C",
        "_C": "B",
        //    "C": "^B",
        //    "^C": "_D",
        "_D": "^C",
        "^D": "_E",
        //    "_E": "^D",
        //    "E": "_F",
        "^E": "F",
        "_F": "E",
        //    "F": "^E",
        //    "^F": "_G",
        "_G": "^F",
        "^G": "_A"
    }
    for (x in respellings) {
        ret = ret.replace(x, respellings[x]);
        ret = ret.replace(x.toLowerCase(), respellings[x].toLowerCase());
    }
    return ret;
}

// Normalizes the given note string, given the key signature.
// This means making sharps or flats explicit, and removing
// extraneous natural signs.
// FIXME: this doesn't preserve accidentals within a measure!
// Returns the normalized note string.
function normalize(value) {

    // Does it have a natural?
    if (value.substr(0,1) == "=") {
        // Yes. Remove it.
        return value.substr(1);
    }

    // Does it already have an accidental?
    if (value.substr(0,1) == "_" ||
        value.substr(0,1) == "^") {
        // Leave it intact
        return value;
    }

    // Find note base name
    var i = value.search(/[A-G]/i);
    if (i == -1) {
        log("Failed to find basename for value!");
        return value;
    }
    var baseName = value.substr(i,1).toUpperCase();
    
    // Transform to key signature

    if (keySignature.accidentalNaturals.search(baseName) != -1) {
        return value;
    }

    if (keySignature.sharps.search(baseName) != -1 ||
        keySignature.accidentalSharps.search(baseName) != -1) {
        return "^" + value;
    }

    if (keySignature.flats.search(baseName) != -1 ||
        keySignature.accidentalFlats.search(baseName)) {
        return "_" + value;
    }

    return value;
}

// Sorts the button entries in the given note->button map, with
// the lowest cost buttons first
function sortButtonMap(noteToButtonMap) {

    for (var note in noteToButtonMap) {
        var buttons = noteToButtonMap[note];

        buttons.sort(function(a,b) {return a.cost-b.cost;});
    }

}


// Given a button->note map, generates
// the corresponding note->button map.
// Keys of this map are filtered through "respell".
// The values of this map have {button, cost, finger}.
// Returns the note->button map
function generateNoteToButtonMap(buttonMap) {
    var noteMap = {};
    for (var b in buttonMap) {
        var notes  = buttonMap[b].notes;
        var cost = buttonMap[b].cost;
        var finger = buttonMap[b].finger;
        if (notes == null) {
            log("Failed to find entry for button " + b);
            next;
        }
        notes.forEach(
            function (v) {
                v = respell(v);
                if (noteMap[v] == null ) { 
                    // Create a new button list for this note.
                    noteMap[v] = [{button: b, cost: cost, finger: finger}];
                } else {
                    // Insert this button into an existing button list for this note.
                    noteMap[v].push({button: b, cost: cost, finger: finger});
                }
            });
        
    }
    return noteMap;
}

function getTime() {
    return (new Date().getTime() - startTime) / 1000;
}

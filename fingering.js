// fingering.js
// Copyright (c) 2013 James van Donsel
//
// ABC muscial notation converter for Anglo Concertina
// Annotates an ABC format tune with semi-optimal fingerings
// for the Anglo Concertina.





// Button maps
// Higher weights mean button is preferred
var jeffriesMap = {

// Top row, LH
"L1a"  : { notes: ["E,", "F,"],  weight: 1, finger: "l4" },
"L2a"  : { notes: ["A,", "_B,"], weight: 1, finger: "l4" },
"L3a"  : { notes: ["^C,", "_E"], weight: 1, finger: "l3" },
"L4a"  : { notes: ["A", "G"],    weight: 1, finger: "l2" },
"L5a"  : { notes: ["^G", "_B"],  weight: 1, finger: "l1" },

// Middle row, LH
"L1"  :  { notes: ["C,", "G,"], weight: 10, finger: "l4" },
"L2"  :  { notes: ["G,", "B,"], weight: 10, finger: "l4" },
"L3"  :  { notes: ["C" , "D"],  weight: 10, finger: "l3" },
"L4"  :  { notes: ["E" , "F"],  weight: 10, finger: "l2" },
"L5"  :  { notes: ["G" , "A"],  weight: 10, finger: "l1" },

// Bottom row, LH
"L6"  :  { notes: ["B," , "A,"], weight: 10, finger: "l4" },
"L7"  :  { notes: ["D"  , "^F"], weight: 9,  finger: "l4" },
"L8"  :  { notes: ["G"  , "A"],  weight: 9,  finger: "l3" },
"L9"  :  { notes: ["B"  , "c"],  weight: 9,  finger: "l2" },
"L10" :  { notes: ["d"  , "e"],  weight: 9,  finger: "l1" },

// Top row, RH
"R1a"  :  { notes: ["^c" , "^d"],  weight: 1, finger: "r1" },
"R2a"  :  { notes: ["a" , "g"],    weight: 1, finger: "r2" },
"R3a"  :  { notes: ["^g", "_b"],   weight: 1, finger: "r3" },
"R4a"  :  { notes: ["^c'", "_e'"], weight: 1, finger: "r4" },
"R5a"  :  { notes: ["a''", "f'"],  weight: 1, finger: "r4" },

// Middle row, RH
"R1"  :  { notes: ["c"  , "B"],  weight: 10, finger: "r1" },
"R2"  :  { notes: ["e"  , "d"],  weight: 10, finger: "r2" },
"R3"  :  { notes: ["g"  , "f"],  weight: 9, finger: "r3" },
"R4"  :  { notes: ["c'" , "a"],  weight: 9, finger: "r4" },
"R5" :   { notes: ["e'" , "b'"], weight: 10, finger: "r4" },

// Bottom row, RH
"R6"  :  { notes: ["g" , "^f"],  weight: 10, finger: "r1" },
"R7"  :  { notes: ["b"  , "a"],   weight: 10, finger: "r2" },
"R8"  :  { notes: ["d" , "c'"],  weight: 10, finger: "r3" },
"R9"  :  { notes: ["g'", "e'"], weight: 10, finger: "r4" },
"R10" :  { notes: ["b", "^f'"],  weight: 10, finger: "r4" },
};

var buttonToNoteMap = jeffriesMap;

// Key signature maps
var c_major_map = {
    "C" : "",
    "D" : "",
    "E" : "",
    "F" : "",
    "G" : "",
    "A" : "",
    "B" : ""
};
var d_major_map = {
    "C" : "^",
    "D" : "",
    "E" : "",
    "F" : "^",
    "G" : "",
    "A" : "",
    "B" : ""
};
var e_major_map = {
    "C" : "^",
    "D" : "^",
    "E" : "",
    "F" : "^",
    "G" : "^",
    "A" : "",
    "B" : ""
};
var f_major_map = {
    "C" : "",
    "D" : "",
    "E" : "",
    "F" : "",
    "G" : "",
    "A" : "",
    "B" : "_"
};
var g_major_map = {
    "C" : "",
    "D" : "",
    "E" : "",
    "F" : "^",
    "G" : "",
    "A" : "",
    "B" : ""
};
var a_major_map = {
    "C" : "^",
    "D" : "",
    "E" : "",
    "F" : "^",
    "G" : "^",
    "A" : "",
    "B" : ""
};
var b_major_map = {
    "C" : "^",
    "D" : "^",
    "E" : "",
    "F" : "^",
    "G" : "^",
    "A" : "^",
    "B" : ""
};

var majorKeyMap = {
    "C" : c_major_map,
    "D" : d_major_map,
    "E" : e_major_map,
    "F" : f_major_map,
    "G" : g_major_map,
    "A" : a_major_map,
    "B" : b_major_map
};
var minorKeyMap = {
    // In terms of their relative major keys
    "C" : null,
    "D" : f_major_map,
    "E" : g_major_map,
    "F" : null,
    "G" : null,
    "A" : c_major_map,
    "B" : d_major_map
};
var dorianKeyMap = {
    // In terms of their relative major keys
    "C" : null,
    "D" : c_major_map,
    "E" : null,
    "F" : null,
    "G" : f_major_map,
    "A" : null,
    "B" : null
};



var keySignatureMap = null;


// Globals
var abcOutput = "TODO";

function finger(abcInput) {
    console.log("Got input:"+abcInput);

    // Find the key signature in the input
    keySignatureMap = findKeySignature(abcInput);

    if (keySignatureMap == null) {
        return ("ERROR: Unknown or unsupported key signature");
    }


     // Generate an array of note objects. Each
     var notes = getAbcNotes(abcInput);

     // Generate the inverse mapping
     var noteToButtonMap = generateNoteToButtonMap(buttonToNoteMap);

     var fingerings = chooseFingerings(notes, noteToButtonMap);
     if (fingerings == null) {
         console.log("No fingerings generated!");
         return abcOutput;
     }

     abcOutput = mergeFingerings(abcInput, fingerings, notes);

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
    
    keySignatureMap = null;

    var keyMatch = abcInput.match(/[kK]: *([a-gA-G]) *(.*?)$/m);
    if (keyMatch == null || keyMatch.length < 2) {
        return null;
    }
    var keySignatureBase=keyMatch[1];
    var keyExtra=keyMatch[2]==null ? "" : keyMatch[2].toLowerCase();
    console.log("Got base key of '" + keySignatureBase + "' and extra of '" + keyExtra + "'");

    // Determine major/minor/dorian
    if (keyExtra == "" ||
        keyExtra.search("maj") != -1 ) {
        // Major
        console.log("Determined a major key in " + keySignatureBase);
        return majorKeyMap[keySignatureBase];
    } else if (keyExtra == "m" ||
               keyExtra.search("min") != -1) {
        // Minor
        console.log("Determined a minor key in " + keySignatureBase);
        return minorKeyMap[keySignatureBase];
    } else if (keyExtra.search("dor") != -1) {
        // Dorian
        console.log("Determined a dorian key in " + keySignatureBase);
        return dorianKeyMap[keySignatureBase];
    } else {
        // Unknown
        console.log("Failed to determine major/minor key signature");
        return null;
    }

}


// Merges an array of fingering strings with an array of Notes
// with the original string input.
// Returns a merged string.
function mergeFingerings(input, fingerings, notes) {
    if (fingerings.length != notes.length) {
        return "ERROR: Internal error. Length mismatch";
    }

    var result = input;
    var insertedTotal = 0;
    for (var i = 0; i < fingerings.length; ++i) {

        var index = notes[i].index + insertedTotal;

        // Add double quotes to fingering
        fingerings[i] = "\"" + fingerings[i] + "\"";

        var fingLen = fingerings[i].length;
        //console.log("Merge["+i+"] index="+index+" fingLen="+fingLen+" insertedTotal="+insertedTotal);

        result = result.substr(0, index) + fingerings[i] + result.substr(index);

        insertedTotal += fingLen;
    }
    
    return result;
}

// Chooses fingerings of for the input Note array using
function chooseFingerings(notes, noteToButtonMap) {
    console.log("Choosing fingerings...");
    var chosenButtons = [];
    for (var i = 0; i < notes.length; ++i) {

        var unNormalizedValue = notes[i].unNormalizedValue;
        var normalizedValue = notes[i].normalizedValue;

        console.log("checking note=" + unNormalizedValue + " normalized=" + normalizedValue);

        var buttons = noteToButtonMap[normalizedValue];
        if (buttons == null || buttons.length < 1) {
            abcOutput = "ERROR:Failed to find button for note '"+unNormalizedValue+"'";
            return null;
        }
        
        // For now, choose button with largest weight
        var bestButton = null;
        var bestWeight = 0;
        buttons.forEach(function(b) {
            if (b.weight > bestWeight) {
                bestWeight = b.weight;
                bestButton = b.button;
            }
        });

        chosenButtons.push(bestButton);
        console.log("Chose button " + bestButton + " for note " + unNormalizedValue);
    }
    return chosenButtons;
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
    while (x = headerRegex.exec(input)) {
        sanitizedInput = sanitizeString(sanitizedInput, x.index, x[0].length);
    }

    // TODO: sanitize embedded quotes, too

    console.log("sanitized input:"+sanitizedInput);
    
    // Find all the notes
    var regex = /([=^_]?[a-gA-G][',]?)/g;
    var notes = [];
    while (m = regex.exec(sanitizedInput)) {
        var unNormalizedValue = m[1];
        var normalizedValue = normalize(unNormalizedValue);
        notes.push(new Note((m.index), unNormalizedValue, normalizedValue));
    }

    return notes;
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
        console.log("Failed to find basename for value!");
        return value;
    }
    var baseName = value.substr(i,1).toUpperCase();
    
    // Transform to key signature
    var accidental = keySignatureMap[baseName];
    
    // Add any accidentals
    return accidental + value;

}



// Given a button->note map, generates
// the corresponding note->button map.
// Returns the note->button map
function generateNoteToButtonMap(buttonMap) {
    var noteMap = {};
    for (var b in buttonMap) {
        var notes  = buttonMap[b].notes;
        var weight = buttonMap[b].weight;
        var finger = buttonMap[b].finger;
        if (notes == null) {
            console.log("Failed to find entry for button " + b);
            next;
        }
        notes.forEach(
            function(v) {
                if (noteMap[v] == null ) { 
                    // Create a new button list for this note.
                    noteMap[v] = [{button: b, weight: weight, finger: finger}];
                } else {
                    // Insert this button into an existing button list for this note.
                    noteMap[v].push({button: b, weight: weight, finger: finger});
                }
            });
        
    }
    return noteMap;
}

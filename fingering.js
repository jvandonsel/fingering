// fingering.js
// Copyright (c) 2013 James van Donsel
//
// ABC muscial notation converter for Anglo Concertina
// Annotates an ABC format tune with semi-optimal fingerings
// for the Anglo Concertina.





// TODO: fill this in with a real button map!
var jeffriesMap = {
// Top row, LH
"L1"  : ["E,", "F,"],
"L2"  : ["A,", "_B,"],
"L3"  : ["^C,", "_E"],
"L4"  : ["A", "G"],
"L5"  : ["^G", "_B"],

// Middle row, LH
"L6"  : ["C,", "G,"],
"L7"  : ["G,", "B,"],
"L8"  : ["C" , "D"],
"L9"  : ["E" , "F"],
"L10" : ["G" , "A"],

// Bottom row, LH
"L11" : ["B," , "A,"],
"L12" : ["D"  , "^F"],
"L13" : ["G"  , "A"],
"L14" : ["B"  , "c"],
"L14" : ["d"  , "e"],

// Top row, RH
"R1"  : ["^c"  , "^d"],
"R2"  : ["a"  , "g"],
"R3"  : ["^g"  , "_b"],
"R4"  : ["^c'" , "_e'"],
"R5"  : ["a''" , "f'"],

// Middle row, RH
"R6"  : ["c"  , "B"],
"R7"  : ["e"  , "d"],
"R8"  : ["g"  , "f"],
"R9"  : ["c'"  , "a"],
"R10" : ["e'"  , "b'"],

// Bottom row, RH
"R11" : ["g"  , "^f"],
"R12" : ["b"  , "a"],
"R13" : ["d"  , "c'"],
"R14" : ["g'"  , "e'"],
"R15" : ["b"  , "^f'"]
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
var e_major_map = {}; // TODO
var f_major_map = {}; // TODO
var g_major_map = {
    "C" : "",
    "D" : "",
    "E" : "",
    "F" : "^",
    "G" : "",
    "A" : "",
    "B" : ""
};
var a_major_map = {}; // TODO
var b_major_map = {}; // TODO


var majorKeyMap = {
    "C" : c_major_map,
    "D" : d_major_map,
    "E" : null, // e_major_map,
    "F" : null, // f_major_map,
    "G" : g_major_map,
    "A" : null, // a_major_map,
    "B" : null, // b_major_map
};
var minorKeyMap = {
    // In terms of their relative major keys
    "C" : null,
    "D" : null,
    "E" : g_major_map,
    "F" : null,
    "G" : null,
    "A" : c_major_map,
    "B" : d_major_map
};


var keySignatureMap = null;


// Globals
var noteToButtonMap;
var abcOutput = "TODO";

function finger(abcInput) {
    console.log("Got input:"+abcInput);

    // Find the key signature in the input
    findKeySignature(abcInput);

    if (keySignatureMap == null) {
        return ("ERROR: Unknown or unsupported key signature");
    }


     // Generate an array of note objects. Each
     var notes = getAbcNotes(abcInput);

     // Generate the inverse mapping
     noteToButtonMap = generateNoteToButtonMap(buttonToNoteMap);

     var fingerings = chooseFingerings(notes);
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
 // returns: nothing
function findKeySignature(abcInput) {
    
    keySignatureMap = null;

    var keyMatch = abcInput.match(/[kK]: *([a-gA-G]) *(.*?)$/m);
    if (keyMatch == null || keyMatch.length < 2) {
        return "ERROR: failed to find input ABC key signature";
    }
    var keySignatureBase=keyMatch[1];
    var keyExtra=keyMatch[2]==null ? "" : keyMatch[2].toLowerCase();
    console.log("Got base key of '" + keySignatureBase + "' and extra of '" + keyExtra + "'");

    // Determine major/minor
    if (keyExtra == "" ||
        keyExtra.search("maj") != -1 ) {
        // Major
        console.log("Determined a major key in " + keySignatureBase);
        keySignatureMap = majorKeyMap[keySignatureBase];
    } else if (keyExtra == "m" ||
               keyExtra.search("min") != -1) {
        // Minor
        console.log("Determined a minor key in " + keySignatureBase);
        keySignatureMap = minorKeyMap[keySignatureBase];
    } else {
        // Unknown
        console.log("Failed to determine major/minor key signature");
        // TODO: throw an exception
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
// the global buttonToNoteMap and noteToButtonMap.
function chooseFingerings(notes) {
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
        
        // For now, choose first available button
        chosenButtons.push(buttons[0]);
        console.log("Chose button " + buttons[0] + " for note " + unNormalizedValue);
    }
    return chosenButtons;
}

// Returns an array of Notes from the ABC string input
function getAbcNotes(input) {
    
    // Remove lines with ':'
    var choppedInput = input.replace(/\w:.*$/mg, "");

    // Sanitize the input
    // Replace the header with a bogus character
    //var choppedInput = input.replace(/\w:.*$/m, "");

    //console.log("replaced input:"+choppedInput);

    var choppedOffset = input.length - choppedInput.length;

    var regex = /([=^_]?[a-gA-G][',]?)/g;
    var notes = [];
    while (m = regex.exec(choppedInput)) {
        var unNormalizedValue = m[1];
        var normalizedValue = normalize(unNormalizedValue);
        //console.log("Found note:"+unNormalizedValue+" at offset "+(m.index+choppedOffset));

        notes.push(new Note((m.index+choppedOffset), unNormalizedValue, normalizedValue));
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
// the corresponding note->button map
function generateNoteToButtonMap(buttonMap) {
    var noteMap = {};
    for (var button in buttonMap) {
        var notes = buttonMap[button];
        if (notes == null) {
            console.log("Failed to find entry for button " + button);
            next;
        }
        notes.forEach(
            function(v) {
                if (noteMap[v] == null ) { 
                    noteMap[v]=[button];
                } else {
                    noteMap[v].push(button);
                }
            });
        
    }
    return noteMap;
}

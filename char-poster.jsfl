/*
   FLAs
   -- v --
   PNGs, named by id (FLA name + frame)
      Info JSON (get possible name from symbol name, need to drill down into graphics)
   -- v --
   collapse visual duplicates
   pack data
   -- v --
   final PNG
*/

(function(path) {
	function bottomLayerIsPlain(timeline) {
		var bottomLayer = timeline.layers[timeline.layerCount - 1];
		var lastFrame = bottomLayer.frameCount - 1;
		return (bottomLayer.frames[lastFrame].startFrame == 0);
	}
	function exportCurrentFrame(filename, settings) {
		var doc = fl.getDocumentDOM();
		var timeline = doc.getTimeline();
		var frame = timeline.currentFrame;

		// Copy frames
		var sel = [];
		for (var layer = 0; layer < timeline.layerCount; layer++) {
			sel.push(layer, frame, frame + 1);
		}
		timeline.setSelectedFrames(sel);
		Export.exportSelectedFrames(filename, settings);
	}

	// Filters a selection, determining which elements are worth diving into
	function filterChildren(children) {
		var result = children.slice().filter(function(element) {
			if (element.elementType != 'instance') return false;
			var type = element.libraryItem.itemType;
			if (type != 'movie clip' && type != 'graphic') return false;
			var name = element.libraryItem.name;
			if (name.indexOf("Body Parts") == 0) return false;
			if (name == 'mouth omg fast') return false;
			//var finalName = name.substring(name.lastIndexOf('/') + 1);
			if (/^Eye /.test(name)) return false;
			if (/^Arm /.test(name)) return false;
			if (/^Leg /.test(name)) return false;
			if (/^Smile /.test(name)) return false;
			if (/^Neutral /.test(name)) return false;
			if (/^Frown /.test(name)) return false;
			return true;
		});
		if (result.length > 1) {
			var allIdentical = true;
			var name = result[0].libraryItem.name;
			for (var i = 1; i < result.length; i++) {
				if (result[i].libraryItem.name != name) {
					allIdentical = false;
				}
			}
			if (allIdentical) {
				result = [result[0]];
			}
		}
		return result;
	}
	function getNameAtCurrentFrame() {
		var doc = fl.getDocumentDOM();
		var timeline = doc.getTimeline();
		var names = [];

		var exitCount = 0;
		doc.selectAll();
		var elements = filterChildren(doc.selection);
		while (elements.length == 1) {
			var newCharName = elements[0].libraryItem.name;
			newCharName = newCharName.substring(newCharName.lastIndexOf('/') + 1);
			if (!/^[0-9 \-_]+$/.test(newCharName)) { // Not all digits
				names.push(newCharName);
			}

			doc.selectNone();
			doc.selection = elements;
			doc.enterEditMode('inPlace');
			exitCount++;

			// Create column of keyframes, in the case of tweens preventing selection
			var clipTimeline = doc.getTimeline();
			clipTimeline.expandFolder(true, true, -1); // Expand all folders
			clipTimeline.layers.forEach(function(layer) {layer.locked = false;});
			var currentFrame = clipTimeline.currentFrame;
			for (var i = 0; i < clipTimeline.layerCount; i++) {
				var layer = clipTimeline.layers[i];
				if (currentFrame >= layer.frameCount) continue;
				clipTimeline.currentLayer = i;
				if (layer.frames[currentFrame].startFrame != currentFrame) {
					clipTimeline.insertKeyframe();
				}
			}

			doc.selectAll();
			elements = filterChildren(doc.selection);
		}
		for (var i = 0; i < exitCount; i++) {
			doc.exitEditMode();
		}
		return names;
	}

	var includePath = path + 'jsfl/';
	fl.runScript(includePath + 'JSON.jsfl');
	fl.runScript(includePath + 'Export.jsfl');

	var settings = JSON.decode(FLfile.read(path + 'settings.json'));

	// Iterate through all frames of all FLAs
	var info = [];
	var filenames = FLfile.listFolder(path + settings['flaPath']);
	//filenames.reverse();
	filenames.forEach(function(filename) {
		fl.openDocument(path + settings['flaPath'] + filename, false);
		var flaDoc = fl.getDocumentDOM();
		var flaTimeline = flaDoc.getTimeline();

		// Delete background layer if there is one
		if (flaTimeline.layerCount > 1 && bottomLayerIsPlain(flaTimeline)) {
			flaTimeline.deleteLayer(flaTimeline.layerCount - 1);
		}

		// Convert all frames to keyframes (API doesn't seem to copy unkeyframed ranges)
		if (flaTimeline.frameCount > 1) {
			var sel = [];
			for (var layer = 0; layer < flaTimeline.layerCount; layer++) {
				sel.push(layer, 0, flaTimeline.layers[layer].frameCount);
			}
			flaTimeline.setSelectedFrames(sel);
			flaTimeline.convertToKeyframes();
		}

		for (var f = 0; f < flaTimeline.frameCount; f++) {
			flaTimeline.currentFrame = f;

			var prefix = filename.substring(0, filename.length - 4).replace(/ /g, '_');
			var charID = prefix + '_' + f;
			var imagePath = path + settings['pngPath'] + charID + '.png';
			exportCurrentFrame(imagePath, settings['imageSettings']);

			var infoEntry = {'id': charID};
			var names = getNameAtCurrentFrame();
			if (names.length) infoEntry['names'] = names;
			info.push(infoEntry);
		}
		flaDoc.close(false);
		FLfile.write(path + 'out/info.json', JSON.encode(info));
	});

})('file:///G|/char-poster/');

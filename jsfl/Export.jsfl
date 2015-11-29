var Export = (function() {
	var CONTAINER_NAME = '=== export container ===';

	function exportUsingNewDocument(filename, settings, pasteCallback) {
		// Create new doc, paste frames into movieclip
		var doc = fl.createDocument();
		var library = doc.library;
		library.addNewItem('movie clip', CONTAINER_NAME);
		library.editItem(CONTAINER_NAME);
		pasteCallback(doc);
		doc.exitEditMode();

		// Place movieclip, scale, & move it
		var scale  = settings['scale' ];
		var margin = settings['margin'];
		library.addItemToDocument({x: 0, y: 0}, CONTAINER_NAME);

		doc.selectAll();
		doc.scaleSelection(scale, scale, 'center');
		var rect = doc.getSelectionRect();
		doc.width  = Math.ceil((rect.right - rect.left) + scale * (margin * 2));
		doc.height = Math.ceil((rect.bottom - rect.top) + scale * (margin * 2));
		doc.moveSelectionBy({
			x: scale * margin - rect.left,
			y: scale * margin - rect.top
		});

		doc.exportPNG(filename, true, true);
		doc.close(false);
	}

	return {
		exportSelectedFrames: function(filename, settings) {
			fl.getDocumentDOM().getTimeline().copyFrames();
			exportUsingNewDocument(filename, settings, function(doc) {
				doc.getTimeline().pasteFrames(0);
			});
		},
    		exportSelection: function(filename, settings) {
			fl.getDocumentDOM().clipCopy();
			exportUsingNewDocument(filename, settings, function(doc) {
				doc.clipPaste();
			});
		}
	};
})();

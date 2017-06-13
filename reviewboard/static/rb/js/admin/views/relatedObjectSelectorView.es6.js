/**
 * A widget to select related objects using search and autocomplete.
 *
 * This is particularly useful for models where there can be a ton of rows in
 * the database. The built-in admin widgets provide a pretty poor
 * experience--either populating the list with the entire contents of the
 * table, which is super slow, or just listing PKs, which isn't usable.
 */
RB.RelatedObjectSelectorView = Backbone.View.extend({
    className: 'related-object-select',

    /**
     * The search placeholder text.
     *
     * Subclasses should override this.
     */
    searchPlaceholderText: '',

    /**
     * The element template.
     *
     * Subclasses may override this to change rendering.
     */
    template: _.template(dedent`
        <select placeholder="<%- searchPlaceholderText %>"
                class="related-object-options"></select>
        <ul class="related-object-selected"></ul>
    `),

    /**
     * Initialize the view.
     *
     * Args:
     *     options (object):
     *         Options for the view.
     *
     * Option Args:
     *     $input (jQuery):
     *         The ``<input>`` element which should be populated with the list
     *         of selected item PKs.
     *
     *     initialOptions (Array of object):
     *         The initially selected options.
     *
     *     selectizeOptions (object):
     *          Additional options to pass in to $.selectize.
     */
    initialize(options) {
        this.options = options;
        this._$input = options.$input;
        this._selectizeOptions = options.selectizeOptions;
        this._selectedIDs = {};

        _.bindAll(this, 'renderOption');
    },

    /**
     * Render the view.
     *
     * Returns:
     *     RB.RelatedObjectSelectorView:
     *     This object, for chaining.
     */
    render() {
        const self = this;

        this.$el.html(this.template({
            searchPlaceholderText: this.searchPlaceholderText,
        }));
        this._$selected = this.$('.related-object-selected');

        this.$('select')
            .selectize(_.defaults(this._selectizeOptions, {
                copyClassesToDropdown: true,
                dropdownParent: 'body',
                preload: 'focus',
                render: {
                    item: () => '', // Always render an empty string.
                    option: this.renderOption,
                },
                load(query, callback) {
                    self.loadOptions(
                        query,
                        data => callback(data.filter(
                            item => !self._selectedIDs.hasOwnProperty(item.id)
                        ))
                    );
                },
                onChange(selected) {
                    if (selected) {
                        self._onItemSelected(this.options[selected], true);
                        this.removeOption(selected);
                    }

                    this.clear();
                },
            }));

        this.options.initialOptions.forEach(
            item => this._onItemSelected(item, false)
        );

        this._$input.after(this.$el);
        return this;
    },

    /**
     * Update the "official" ``<input>`` element.
     *
     * This copies the list of selected item IDs into the form field which will
     * be submitted.
     */
    _updateInput() {
        this._$input.val(Object.keys(this._selectedIDs).join(','));
    },

    /**
     * Callback for when an item is selected.
     *
     * Args:
     *     item (object):
     *         The newly-selected item.
     *
     *     addToInput (boolean):
     *         Whether the ID of the item should be added to the ``<input>``
     *         field.
     *
     *         This will be ``false`` when populating the visible list from the
     *         value of the form field when the page is initially loaded, and
     *         ``true`` when adding items interactively.
     */
    _onItemSelected(item, addToInput) {
        const $li = $('<li>').html(this.renderOption(item));
        const $items = this._$selected.children();
        const text = $li.text();

        $('<span class="remove-item fa fa-close">')
            .click(() => this._onItemRemoved($li, item))
            .appendTo($li);

        let attached = false;

        for (let i = 0; i < $items.length; i++) {
           const $item = $items.eq(i);

            if ($item.text().localeCompare(text) > 0) {
                $item.before($li);
                attached = true;
                break;
            }
        }

        if (!attached) {
            $li.appendTo(this._$selected);
        }

        this._selectedIDs[item.id] = item;

        if (addToInput) {
            this._updateInput();
        }
    },

    /**
     * Callback for when an item is removed from the list.
     *
     * Args:
     *     $li (jQuery):
     *         The element representing the item in the selected list.
     *
     *     item (object):
     *         The item being removed.
     */
    _onItemRemoved($li, item) {
        $li.remove();
        delete this._selectedIDs[item.id];
        this._updateInput();
    },

    /**
     * Render an option in the drop-down menu.
     *
     * This should be overridden in order to render type-specific data.
     *
     * Args:
     *     item (object):
     *         The item to render.
     *
     * Returns:
     *     string:
     *     HTML to insert into the drop-down menu.
     */
    renderOption(/* item */) {
        return '';
    },

    /**
     * Load options from the server.
     *
     * This should be overridden in order to make whatever API requests are
     * necessary.
     *
     * Args:
     *     query (string):
     *         The string typed in by the user.
     *
     *     callback (function):
     *         A callback to be called once data has been loaded. This should
     *         be passed an array of objects, each representing an option in
     *         the drop-down.
     */
    loadOptions(query, callback) {
        callback();
    },
});
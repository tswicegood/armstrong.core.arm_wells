Node = Item.extend({
    url: ""
});

NodeList = Backbone.Collection.extend({
    url: "",
    model: Node,
    parseForm: function(prefix) {
        var forms = $('#' + prefix + '-forms');
        var list = this;
        forms.children().each(function(idx, el){
            var node = new Node({prefix: el.id+"-"});
            list.add(node);
        });
    },
    comparator: function(node) {
        return node.get("order");
    }
});

ManagementForm = Backbone.View.extend({
    initialize: function() {
        this.options.collection.bind("reset", this.update, this);
        this.options.collection.bind("add", this.update, this);
        this.options.collection.bind("remove", this.update, this);
    },
    update: function() {
        $("#id_"+this.options.prefix+"-TOTAL_FORMS").val(this.options.collection.length);
    }
})

NodeListItemView = Backbone.View.extend({
    tagName: "div",
    className: "node-inline",
    events: {
        "click .delete": "deletePushed"
    },
    initialize: function() {
        this.model.bind('change', this.render, this);
    },
    render: function() {
        var html = this.options.template(this.model.toJSON());
        $(this.el).html(html);
        if (this.model.get("hatband_display") === undefined) {
            $.get(this.options.preview_url,
                  {  object_id: this.model.get("object_id"),
                     content_type_id: this.model.get("content_type")},
                  this.setDisplay(),
                  'html');
        }
        return this;
    },
    setDisplay: function() {
        var self = this;
        return function(data, status, jqXHR) {
            self.model.set({hatband_display: data});
        }
    },
    deletePushed: function() {
        this.model.set({DELETE: 1});
        $(this.el).hide('drop');
    }
});

NodeListView = Backbone.View.extend({
    tagName: "div",
    initialize: function() {
        if (!this.collection) {
            this.collection = new NodeList;
            this.collection.parseForm(this.options.prefix);
        }
        this.options.managementForm = new ManagementForm({
            prefix: this.options.prefix,
            collection: this.collection
        });

        $(this.el).sortable();
        // note jQuery bind, not backbone
        var self = this;
        $(this.el).bind('sortupdate', function(){self.sorted();});

        this.displayCollection();
    },
    displayNode: function(node) {
        var view = new NodeListItemView({
                model: node,
                id: node.cid,
                prefix: this.options.prefix,
                template: _.template($('#'+this.options.prefix+'-list-item-template').html()),
                preview_url: this.options.preview_url
            });
        $(this.el).append(view.render().el);
    },
    displayCollection: function() {
        for(i=0; i<this.collection.length; i++){
            this.displayNode(this.collection.at(i));
        }
    },
    addNodeFromForm: function() {
        var selector = "input[id^='id_" + this.options.prefix + "-__prefix__']"
        var sourceForm = $(selector);
        var formId = this.collection.length;
        var formDiv = $('<div id="' + this.options.prefix + '-' + formId + '" class="' + this.options.prefix + '-object"></div>');
        $("#" + this.options.prefix + "-forms").append(formDiv);
        sourceForm.each(function(idx, el) {
            el = $(el);
            var newEl = el.clone();
            newEl.attr('id', el.attr('id').replace('__prefix__', formId));
            newEl.attr('name', el.attr('name').replace('__prefix__', formId));
            newEl.attr('type', 'hidden')
            formDiv.append(newEl);
        });
        var node = new Node({prefix: this.options.prefix+"-"+formId+"-"});
        node.parse();
        this.addNode(node);
    },
    addNode: function(node) {
        this.collection.add(node);
        this.displayNode(node);
        this.sorted();
    },
    sorted: function() {
        var self = this;
        var models = _.map($(this.el).children(), function(item){
            return self.collection.getByCid($(item).attr('id'));
        });
        _.each(models, function(model, idx, list) {
            model.set({'order': idx});
        });
    }
});

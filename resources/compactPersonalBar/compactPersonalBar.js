// FIXME: This is only for the Compact personal bar beta feature. The code
// below rearranges items in the personal bar, adds click event logging and
// hijacks mw.util.addPortletLink so that gadgets add new items to the flyout
// instead of the old personal bar.
// If this feature is ever merged into the core, this code should not be used
// anymore. Instead, the Vector skin itself should be modified.

( function( mw, $ ) {
	'use strict';

	var addPortletLinkOld = mw.util.addPortletLink, bar, menu;

	function createItem( options ) {
		var $a = $( '<a>' ).
			text( options.text ).
			attr( 'href', options.href ).
			attr( 'accesskey', options.accesskey ).
			attr( 'title', options.title );

		if ( options.count ) {
			$a.append( $( '<span>' ).text( options.count ) );
		}

		return $( '<li>' ).attr( 'id', options.id ).append( $a );
	}

	function CompactMenu( name, groups ) {
		var self = this;

		this.$el = $( '<ul>' );
		this.name = name;
		this.order = groups;
		this.items = {};
		$.each( groups, function() {
			self.items[this] = [];
		} );
	}

	CompactMenu.prototype.addItem = function( group, name, $el ) {
		if ( !this.items[group].length ) {
			$el.addClass( 'group-start' );
		}
		this.items[group].push( $el );
		this.render();

		if ( name ) {
			mw.beta.trackClick( $el, 'PersonalBar', {
				action: 'link-click',
				link: name,
				version: this.name,
				userId: mw.user.getId()
			} );
		}

		return this;
	};

	CompactMenu.prototype.render = function() {
		var self = this;

		// we don't have to do this.$el.empty() because elements won't get cloned
		// anyway (plus empty() would remove all click tracking callbacks)

		$.each( this.order, function() {
			$.each( self.items[this], function() {
				self.$el.append( this );
			} );
		} );
	};

	bar = new CompactMenu( 'compact-bar', ['main'] );
	menu = new CompactMenu( 'compact-flyout', ['user', 'interactions', 'portlets', 'preferences', 'end'] );

	mw.util.addPortletLink = function( portlet, href, text, id, tooltip, accesskey ) {
		var $a, $li;

		// forward calls adding stuff to places other than personal bar
		if ( portlet !== 'p-personal' ) {
			return addPortletLinkOld.apply( mw.util, arguments );
		}

		$a = $( '<a>' ).text( text ).attr( 'href', href );
		$li = $( '<li>' ).append( $a );

		// copied from mediawiki.util.js
		if ( tooltip ) {
			// Trim any existing accesskey hint and the trailing space
			tooltip = $.trim( tooltip.replace( mw.util.tooltipAccessKeyRegexp, '' ) );
			if ( accesskey ) {
				tooltip += ' [' + accesskey + ']';
			}
		}

		menu.addItem( 'portlets', null, createItem( {
			id: id,
			text: text,
			href: href,
			accesskey: accesskey,
			title: tooltip
		} ) );
		return $li;
	};

	$( function() {
		var $barContainer = $( '#p-personal' );

		menu.
			addItem( 'user', 'user-page', $( '#pt-userpage' ) ).
			addItem( 'interactions', 'contributions', $( '#pt-mycontris' ) ).
			// notifications item can't be simply cloned, markup has to be changed
			// and label added
			addItem( 'interactions', 'notifications', createItem( {
				id: 'pt-notifications-flyout',
				text: mw.msg( 'notifications' ),
				count: $( '#pt-notifications' ).text(),
				href: $( '#pt-notifications' ).find( 'a' ).attr( 'href' )
			} ) ).
			addItem( 'interactions', 'talk', $( '#pt-mytalk' ) ).
			addItem( 'interactions', 'watchlist', $( '#pt-watchlist' ) ).
			addItem( 'preferences', 'preferences', $( '#pt-preferences' ) ).
			addItem( 'preferences', 'beta', $( '#pt-betafeatures' ) ).
			addItem( 'end', 'privacy', createItem( {
				text: mw.msg( 'privacy' ),
				href: mw.util.getUrl( mw.msg( 'privacypage' ) )
			} ) ).
			addItem( 'end', 'help', createItem( {
				text: mw.msg( 'help' ),
				href: mw.util.getUrl( mw.msg( 'helppage' ) )
			} ) ).
			addItem( 'end', 'logout', $( '#pt-logout' ) );

		bar.
			addItem( 'main', 'language', $( '#pt-uls' ) ).
			addItem( 'main', 'notifications', $( '#pt-notifications' ) ).
			addItem( 'main', null, menu.$el.wrap( '<li id="pt-flyout">' ).parent() );

		// remove the old list
		$barContainer.find( 'ul' ).remove();
		// add the new one (setTimeout prevents CSS transition flash)
		setTimeout( function() {
			$barContainer.append( bar.$el );
		}, 0 );
	} );

}( mediaWiki, jQuery ) );


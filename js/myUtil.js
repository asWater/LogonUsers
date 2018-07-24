/*
spa.util.js
 */

/*jslint
	browser : true, continue : true, 
	devel   : true, indent   : 2,      maxerr : 50,
	newcap  : true, nomen    : true, plusplus : true,
	regexp  : true, sloppy   : true,     vars : true,
	white   : true
*/
/*global $, spa */

myUtil = (function ()
{
	//===================================
	// Module Scope Variant >>> Start 

	var
		getDateArray,
		getBrowserLang,
		sortBy,
		groupBy;

	// Module Scope Variant <<< End
	//===================================


	//===================================
	// Utility Methods >>> Start

	// Utility Methods <<< End
	//===================================


	//===================================
	// DOM Methods >>> Start

	// DOM Methods <<< End
	//===================================


	//===================================
	// Event Handlers >>> Start

	// Event Handlers <<< End
	//===================================



	//===================================
	// Public Methods >>> Start

	getBrowserLang = function()
	{
		try
		{
			return ( navigator.language || navigator.browserLanguage || navigator.userLanguage ).substr( 0, 2 );
		}
		catch( e )
		{
			return undefined;
		}
	};

	// <Public Constructor> "getDateArray".
	// [Objective]: Return dates in array by getting date range (start date and end date).
	// [Arguments]:
	// 	- startDate   > Start date of date range.
	// 	- endDate     > End date of date range.
	// 	- dateFormat  > Date format used in moment.js (e.g. "YYYY/MM/DD ddd").
	// [Return value]: Newly created array which holds dates.
	// [Exeptions]: none.
	//

	getDateArray = function ( startDate, endDate, dateFormat )
	{
		var
			dates = [],
			start = moment( startDate ).subtract( 1, 'd' ),
			end = moment( endDate ),
			diff = end.diff( start, 'days' );

		if( !start.isValid() || !end.isValid() || diff <= 0 )
		{
            return;
        }

        for( var i = 0; i < diff; i++ )
        {
            dates.push( start.add( 1, 'd' ).format( dateFormat ));
        }

        return dates;
	};

    // Example: data.sort(sort_by('id', false, function(a){return a.toUpperCase()}));
	sortBy = function ( field, reverse, primer )
	{
		reverse = (reverse) ? -1 : 1;

		return function ( a, b )
		{
			a = a[field];
			b = b[field];

			if (typeof(primer) != 'undefined' )
			{
				a = primer(a);
				b = primer(b);
			}

			if (a < b) return reverse * -1;
			if (a > b) return reverse * 1;

			return 0;
		};
	};

	groupBy = function ( items, propertyName )
	{
		var result = [];

		$.each( items, function( index, item )
		{
			if ($.inArray( item[propertyName], result ) == -1 )
			{
				result.push( item[propertyName] );
			}
		});

		return result;
	};

	// Public Methods <<< End
	//===================================


	// ### Return Public Methods ###
	return {
		getDateArray : getDateArray,
		getBrowserLang : getBrowserLang,
		sortBy : sortBy,
		groupBy : groupBy
	};

}());
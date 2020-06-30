
var vscode = require( 'vscode' );
var micromatch = require( 'micromatch' );

function activate( context )
{
    var outputChannel;
    var syncInProgress = false;

    function debug( text, reveal )
    {
        if( outputChannel )
        {
            var timestamp = new Date().toLocaleTimeString();

            outputChannel.appendLine( timestamp + ' ' + text );
            if( reveal === true )
            {
                outputChannel.show();
            }
        }
    }

    function resetOutputChannel()
    {
        if( outputChannel )
        {
            outputChannel.dispose();
            outputChannel = undefined;
        }
        if( vscode.workspace.getConfiguration( 'breakpoint-sync' ).debug === true )
        {
            outputChannel = vscode.window.createOutputChannel( "Breakpoint Sync" );
        }
    }

    function findBreakpoint( breakpoint )
    {
        return simplify( breakpoint ) === this.toString();
    }

    function filterBreakpoint( breakpoint )
    {
        var result = simplify( breakpoint ) !== this.toString();
        return result;
    }

    function simplify( breakpoint )
    {
        var text = "";
        if( breakpoint.location )
        {
            text += breakpoint.location.uri.path + ",";
            if( breakpoint.location.range.start )
            {
                text += ( breakpoint.location.range.start.line + 1 ) + ':' + breakpoint.location.range.start.character;
            }
            else
            {
                text += ( breakpoint.location.range[ 0 ].line + 1 ) + ':' + breakpoint.location.range[ 0 ].character;
            }
        }
        return text;
    }

    function include( breakpoint )
    {
        var includes = vscode.workspace.getConfiguration( 'breakpoint-sync' ).get( 'include', [] );
        var posix_includes = includes.map( function( glob )
        {
            return glob.replace( /\\/g, '/' );
        } );

        return posix_includes.length === 0 || micromatch.isMatch( breakpoint.location.uri.path, posix_includes );
    }

    function createBreakpoint( breakpoint )
    {
        var newBreakpoint = new vscode.SourceBreakpoint(
            new vscode.Location(
                vscode.Uri.file( breakpoint.location.uri.path ),
                new vscode.Range(
                    new vscode.Position( breakpoint.location.range[ 0 ].line, breakpoint.location.range[ 0 ].character ),
                    new vscode.Position( breakpoint.location.range[ 1 ].line, breakpoint.location.range[ 1 ].character )
                )
            ),
            breakpoint.enabled,
            breakpoint.condition,
            breakpoint.hitCondition,
            breakpoint.logMessage );
        vscode.debug.addBreakpoints( [ newBreakpoint ] );
    }

    function sync()
    {
        syncInProgress = true;

        debug( "Sync..." );

        var currentBreakpoints = vscode.debug.breakpoints;

        var breakpoints = context.globalState.get( 'breakpoint-sync.breakpoints' ) || [];

        currentBreakpoints.map( function( breakpoint )
        {
            if( include( breakpoint ) )
            {
                var existingBreakpoint = breakpoints.find( findBreakpoint, simplify( breakpoint ) );
                if( existingBreakpoint === undefined )
                {
                    var oldBreakpoints = [];
                    oldBreakpoints.push( breakpoint );
                    debug( "Removing cached breakpoint " + simplify( breakpoint ) );
                    vscode.debug.removeBreakpoints( oldBreakpoints );
                }
            }
        } );

        breakpoints.map( function( breakpoint )
        {
            if( include( breakpoint ) )
            {
                var existingBreakpoint = currentBreakpoints.find( findBreakpoint, simplify( breakpoint ) );
                if( existingBreakpoint === undefined )
                {
                    debug( "Adding cached breakpoint " + simplify( breakpoint ) );
                    createBreakpoint( breakpoint );
                }
                else
                {
                    if( existingBreakpoint.enabled !== breakpoint.enabled )
                    {
                        debug( ( existingBreakpoint.enabled ? "Disabling" : "Enabling" ) + " breakpoint " + simplify( breakpoint ) );
                    }
                    existingBreakpoint.enabled = breakpoint.enabled;
                    vscode.debug.removeBreakpoints( [ existingBreakpoint ] );
                    createBreakpoint( breakpoint );
                }
            }
        } );

        syncInProgress = false;
    }

    context.subscriptions.push( vscode.commands.registerCommand( 'breakpoint-sync.resetCache', function()
    {
        context.globalState.update( 'breakpoint-sync.breakpoints', [] );
        debug( "Cache cleared", true );
    } ) );

    context.subscriptions.push( vscode.commands.registerCommand( 'breakpoint-sync.showCache', function()
    {
        var breakpoints = context.globalState.get( 'breakpoint-sync.breakpoints' ) || [];
        debug( JSON.stringify( breakpoints, null, 2 ), true );
    } ) );

    context.subscriptions.push( vscode.window.onDidChangeWindowState( function( e )
    {
        if( e.focused )
        {
            sync();
        }
    } ) );

    context.subscriptions.push( vscode.debug.onDidChangeBreakpoints( function( e )
    {
        if( syncInProgress === false )
        {
            var breakpoints = [];
            try
            {
                breakpoints = context.globalState.get( 'breakpoint-sync.breakpoints' ) || [];
            }
            catch( e )
            {
                breakpoints = [];
            }

            e.added.map( function( breakpoint )
            {
                if( include( breakpoint ) )
                {
                    var existingBreakpoint = breakpoints.find( findBreakpoint, simplify( breakpoint ) );
                    if( existingBreakpoint === undefined )
                    {
                        debug( "Adding live breakpoint " + simplify( breakpoint ) );
                        breakpoints.push( breakpoint );
                    }
                }
            } );
            e.removed.map( function( breakpoint )
            {
                if( include( breakpoint ) )
                {
                    debug( "Removing live breakpoint " + simplify( breakpoint ) );
                    breakpoints = breakpoints.filter( filterBreakpoint, simplify( breakpoint ) );
                }
            } );
            e.changed.map( function( breakpoint )
            {
                if( include( breakpoint ) )
                {
                    debug( ( breakpoint.enabled ? "Enabled" : "Disabled" ) + " breakpoint " + simplify( breakpoint ) );
                    var existingBreakpoint = breakpoints.find( findBreakpoint, simplify( breakpoint ) );
                    existingBreakpoint.enabled = breakpoint.enabled;
                }
            } );
            context.globalState.update( 'breakpoint-sync.breakpoints', breakpoints );
        }
    } ) );

    context.subscriptions.push( vscode.workspace.onDidChangeConfiguration( function( e )
    {
        if( e.affectsConfiguration( "breakpoint-sync.debug" ) )
        {
            resetOutputChannel();
        }
    } ) );

    resetOutputChannel();

    debug( "Ready" );

    sync();
}

exports.activate = activate;
exports.deactivate = () => { };

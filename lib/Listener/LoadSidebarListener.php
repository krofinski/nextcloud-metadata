<?php
namespace OCA\Metadata\Listener;

use OCA\Metadata\AppInfo\Application;
use OCA\Files\Event\LoadSidebar;
use OCP\AppFramework\Http\EmptyContentSecurityPolicy;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Security\CSP\AddContentSecurityPolicyEvent;
use OCP\Util;

class LoadSidebarListener implements IEventListener {
	// AddContentSecurityPolicyEvent is dispatched when the response headers are built,
	// i.e. after LoadSidebar, so the policy is only extended on pages showing the sidebar
	private static $sidebarLoaded = false;

	public function handle(Event $event): void {
		if ($event instanceof LoadSidebar) {
			Util::addStyle(Application::APP_ID, 'tabview');
			Util::addScript(Application::APP_ID, 'tabview');
			self::$sidebarLoaded = true;

		} else if (($event instanceof AddContentSecurityPolicyEvent) && self::$sidebarLoaded) {
			$policy = new EmptyContentSecurityPolicy();
			$policy->addAllowedConnectDomain('https://nominatim.openstreetmap.org/');
			$policy->addAllowedFrameDomain('https://www.openstreetmap.org/');
			$event->addPolicy($policy);
		}
	}
}

Use GitHub installation commands when the user needs to connect or inspect GitHub App installations for this company.
Call github.installation.list before starting a new install when you need to know what is already connected.
Use github.installation.start to create the install URL; give that URL to the user and let the callback report completion back into this session.
Do not choose a return page for chat-started installs. The command returns users to this source chat after GitHub redirects back.

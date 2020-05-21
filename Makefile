SHELL=/bin/bash -euo pipefail

build-api:
	scripts/build_proxy.sh

install-api-specification-dependencies:
	npm --prefix specification install
	cd specification && poetry install 

build-api-specification:
	mkdir -p build && cd specification && npm run lint && npm run check-licenses && npm run build 2> /dev/null
